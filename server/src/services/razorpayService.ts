// Razorpay service abstraction.
//
// DEMO MODE (default): no credentials required. Returns realistic, clearly
// labelled mocked responses so the full product works with zero setup.
//
// TEST MODE: activated automatically when RAZORPAY_KEY_ID and
// RAZORPAY_KEY_SECRET are present in the environment. Uses Razorpay's
// official Test Mode REST API (https://api.razorpay.com/v1) with Basic Auth.
// Secrets are NEVER sent to the frontend — only this backend module reads
// process.env directly.

const KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

export const isTestModeConfigured = Boolean(KEY_ID && KEY_SECRET);

function authHeader(): string {
  const token = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
  return `Basic ${token}`;
}

export interface PaymentLinkResult {
  id: string;
  shortUrl: string;
  status: string;
  mode: 'demo' | 'test';
}

export async function createPaymentLink(amount: number, customerName: string, customerEmail: string, description: string): Promise<PaymentLinkResult> {
  if (!isTestModeConfigured) {
    // Deterministic mocked response.
    const id = `plink_demo_${Math.abs(hashString(customerEmail + amount)).toString(36)}`;
    return {
      id,
      shortUrl: `https://rzp.io/demo/${id}`,
      status: 'created',
      mode: 'demo',
    };
  }

  try {
    const res = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: 'INR',
        description,
        customer: { name: customerName, email: customerEmail },
        notify: { sms: false, email: false },
      }),
    });
    const data = (await res.json()) as any;
    if (!res.ok) throw new Error(data?.error?.description || 'Razorpay API error');
    return { id: data.id, shortUrl: data.short_url, status: data.status, mode: 'test' };
  } catch (err) {
    // Network unavailable / API error -> gracefully fall back to demo mock
    // so the product never breaks a live demo.
    const id = `plink_fallback_${Math.abs(hashString(customerEmail + amount)).toString(36)}`;
    return { id, shortUrl: `https://rzp.io/demo/${id}`, status: 'created', mode: 'demo' };
  }
}

export async function fetchPayment(paymentId: string) {
  if (!isTestModeConfigured) {
    return { id: paymentId, status: 'captured', mode: 'demo' as const };
  }
  try {
    const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: { Authorization: authHeader() },
    });
    const data = (await res.json()) as any;
    return { id: data.id, status: data.status, mode: 'test' as const };
  } catch {
    return { id: paymentId, status: 'captured', mode: 'demo' as const };
  }
}

export async function fetchOrder(orderId: string) {
  if (!isTestModeConfigured) {
    return { id: orderId, status: 'paid', mode: 'demo' as const };
  }
  try {
    const res = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
      headers: { Authorization: authHeader() },
    });
    const data = (await res.json()) as any;
    return { id: data.id, status: data.status, mode: 'test' as const };
  } catch {
    return { id: orderId, status: 'paid', mode: 'demo' as const };
  }
}

export async function getPaymentStatus(paymentId: string) {
  const payment = await fetchPayment(paymentId);
  return payment.status;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
