import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Save, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';
import { cn } from '../lib/format';

export default function Settings() {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    api.settings().then(setSettings).catch(() => toast.error('Could not load settings.'));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await api.updateSettings(settings);
      setSettings((prev: any) => ({ ...prev, ...res.settings }));
      toast.success('Policies updated. New rules apply immediately.');
    } catch {
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return <div className="space-y-4 animate-fade-up"><div className="h-8 w-56 shimmer rounded" /><div className="panel p-6 h-64 shimmer" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-cream-100 tracking-tight flex items-center gap-2">
          <SettingsIcon size={22} className="text-gold-400" /> Settings
        </h1>
        <p className="text-sm text-cream-400 mt-1">Configure recovery policies, agent behavior, and API credentials.</p>
      </div>

      <section className="panel p-6 space-y-5">
        <h3 className="text-sm font-semibold text-cream-100">Recovery Policies</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <NumberField label="Maximum retry attempts" value={settings.maxRetries} onChange={(v) => setSettings({ ...settings, maxRetries: v })} />
          <NumberField label="Maximum contact attempts" value={settings.maxContacts} onChange={(v) => setSettings({ ...settings, maxContacts: v })} />
          <NumberField label="Minimum recovery probability (%)" value={settings.minRecoveryProbability} onChange={(v) => setSettings({ ...settings, minRecoveryProbability: v })} />
          <NumberField label="High-value threshold (₹)" value={settings.highValueThreshold} onChange={(v) => setSettings({ ...settings, highValueThreshold: v })} />
          <NumberField label="Cooldown period (minutes)" value={settings.cooldownMinutes} onChange={(v) => setSettings({ ...settings, cooldownMinutes: v })} />
        </div>
      </section>

      <section className="panel p-6 space-y-4">
        <h3 className="text-sm font-semibold text-cream-100">Agent</h3>
        <ToggleRow label="Autonomous mode" desc="Allow the agent to execute recovery actions without manual approval." checked={settings.autonomousMode} onChange={(v) => setSettings({ ...settings, autonomousMode: v })} />
        <ToggleRow label="Require approval for high-value actions" desc="Transactions above the high-value threshold require manual approval." checked={settings.requireApprovalHighValue} onChange={(v) => setSettings({ ...settings, requireApprovalHighValue: v })} />
        <ToggleRow label="Audit logging" desc="Record every decision and action to the audit trail." checked={settings.auditLogging} onChange={(v) => setSettings({ ...settings, auditLogging: v })} />
        <ToggleRow label="Demo mode" desc="Use synthetic data and mocked Razorpay responses." checked={settings.demoMode} onChange={(v) => setSettings({ ...settings, demoMode: v })} />
      </section>

      <section className="panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-cream-100">API Configuration</h3>
          <button onClick={() => setShowSecrets((v) => !v)} className="flex items-center gap-1.5 text-xs text-cream-400 hover:text-cream-200">
            {showSecrets ? <EyeOff size={13} /> : <Eye size={13} />} {showSecrets ? 'Hide' : 'Show'}
          </button>
        </div>
        <p className="text-xs text-cream-400">
          Secrets are configured via server-side environment variables (see <code className="text-gold-400">.env.example</code>) and are never sent to the browser.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <ReadOnlyField label="Razorpay Key ID" value={settings.razorpayKeyId || 'Not configured'} />
          <ReadOnlyField label="Razorpay Key Secret" value={showSecrets ? settings.razorpaySecretMasked || 'Not configured' : maskValue(settings.razorpaySecretMasked)} />
          <ReadOnlyField label="AI Provider" value={settings.aiProvider} />
          <ReadOnlyField label="AI API Key" value={showSecrets ? settings.aiKeyMasked || 'Not configured' : maskValue(settings.aiKeyMasked)} />
        </div>
        <div className={cn('tag', settings.razorpayMode === 'test' ? 'text-emerald-300 border-emerald-800/40 bg-emerald-950/20' : 'text-gold-400 border-gold-700/30 bg-gold-500/5')}>
          {settings.razorpayMode === 'test' ? 'RAZORPAY TEST MODE' : 'DEMO MODE'}
        </div>
      </section>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-base-950 font-semibold px-5 py-2.5 rounded-lg transition-colors"
      >
        <Save size={15} /> {saving ? 'Saving...' : 'Save Policies'}
      </button>
    </div>
  );
}

function maskValue(v: string) {
  return v ? '••••••••••••' : 'Not configured';
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-cream-400 uppercase tracking-wide mb-1.5 block">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-base-800/60 border border-base-700/60 rounded-lg px-3 py-2 text-sm text-cream-100 focus:outline-none focus:border-gold-700/50"
      />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-cream-400 uppercase tracking-wide mb-1.5 block">{label}</label>
      <div className="w-full bg-base-800/40 border border-base-700/60 rounded-lg px-3 py-2 text-sm text-cream-300 mono truncate">{value}</div>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <p className="text-sm text-cream-100">{label}</p>
        <p className="text-xs text-cream-400 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn('w-11 h-6 rounded-full relative shrink-0 transition-colors', checked ? 'bg-gold-500' : 'bg-base-700')}
      >
        <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
      </button>
    </div>
  );
}
