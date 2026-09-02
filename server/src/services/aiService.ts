import { analyzeTransaction, AgentInput, AgentOutput } from '../agents/recoveryAgent';

// AI service abstraction. The deterministic Demo Agent requires NO API key
// and is used by default (AI_PROVIDER=demo). If OPENAI_API_KEY or
// ANTHROPIC_API_KEY are supplied and AI_PROVIDER is set accordingly, Revora
// will call the respective API to (re)generate the natural-language
// diagnosis narrative — the underlying probability/decision math always
// stays deterministic and explainable, per the safety design of the agent.

const AI_PROVIDER = (process.env.AI_PROVIDER || 'demo') as 'demo' | 'openai' | 'anthropic';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

export function currentProvider(): string {
  if (AI_PROVIDER === 'openai' && OPENAI_API_KEY) return 'openai';
  if (AI_PROVIDER === 'anthropic' && ANTHROPIC_API_KEY) return 'anthropic';
  return 'demo';
}

export async function runDiagnosis(input: AgentInput): Promise<AgentOutput> {
  // Always compute the deterministic, explainable baseline first.
  const base = analyzeTransaction(input);

  const provider = currentProvider();
  if (provider === 'demo') return base;

  // Optional: enrich the diagnosis text using a live LLM call. Any failure
  // (no network, bad key, rate limit) silently falls back to the
  // deterministic result so the product never breaks.
  try {
    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a payments recovery analyst. Reply in one short sentence.' },
            { role: 'user', content: `Diagnose this failed payment: ${JSON.stringify(input)}` },
          ],
          max_tokens: 60,
        }),
      });
      const data = (await res.json()) as any;
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (text) return { ...base, diagnosis: text };
    }

    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 60,
          messages: [{ role: 'user', content: `Diagnose this failed payment in one short sentence: ${JSON.stringify(input)}` }],
        }),
      });
      const data = (await res.json()) as any;
      const text = data?.content?.[0]?.text?.trim();
      if (text) return { ...base, diagnosis: text };
    }
  } catch {
    // fall through to deterministic base
  }

  return base;
}
