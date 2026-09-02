export function formatINR(amount: number): string {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatINRFull(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
}

export const FAILURE_LABELS: Record<string, string> = {
  bank_decline: 'Bank decline',
  insufficient_funds: 'Insufficient funds',
  expired_card: 'Expired card',
  checkout_abandonment: 'Checkout abandonment',
  subscription_failure: 'Subscription failure',
};

export const ACTION_LABELS: Record<string, string> = {
  payment_link: 'Payment Link',
  retry_payment: 'Retry Payment',
  retry_later: 'Retry in 12h',
  update_payment_method: 'Update Payment Method',
  recovery_reminder: 'Recovery Reminder',
  escalate: 'Escalate',
  stop: 'Stop',
};

export const STATUS_LABELS: Record<string, string> = {
  failed: 'Failed',
  pending: 'Pending',
  ready: 'Ready',
  in_progress: 'In Progress',
  recovered: 'Recovered',
  escalated: 'Escalated',
  stopped: 'Stopped',
};

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
