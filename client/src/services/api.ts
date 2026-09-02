const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  health: () => request<{ status: string; mode: string; aiProvider: string }>('/health'),
  dashboard: (days = 30) => request<any>(`/dashboard?days=${days}`),
  transactions: (params: { status?: string; search?: string; filter?: string } = {}) => {
    // URLSearchParams serializes undefined values as the literal string
    // "undefined". That caused the Transactions and Recovery Queue pages
    // to request ?search=undefined and receive an empty result set.
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') query.set(key, value);
    });
    const q = query.toString();
    return request<{ transactions: any[]; total: number }>(`/transactions${q ? `?${q}` : ''}`);
  },
  transaction: (id: string) => request<{ transaction: any; actionMeta: any; actionLabel: string }>(`/transactions/${id}`),
  runAgent: (transactionId: string) =>
    request<any>('/agent/run', { method: 'POST', body: JSON.stringify({ transactionId }) }),
  execute: (id: string) => request<any>(`/recovery/${id}/execute`, { method: 'POST' }),
  pause: (id: string) => request<any>(`/recovery/${id}/pause`, { method: 'POST' }),
  escalate: (id: string, reason?: string) =>
    request<any>(`/recovery/${id}/escalate`, { method: 'POST', body: JSON.stringify({ reason }) }),
  simulateFailure: (id: string, scenario: string) =>
    request<any>(`/recovery/${id}/simulate-failure`, { method: 'POST', body: JSON.stringify({ scenario }) }),
  simulate: (config: any) => request<any>('/recovery/simulate', { method: 'POST', body: JSON.stringify(config) }),
  audit: (filter = 'all') => request<{ events: any[]; total: number }>(`/audit?filter=${filter}`),
  analytics: (days = 30) => request<any>(`/analytics?days=${days}`),
  settings: () => request<any>('/settings'),
  updateSettings: (settings: any) => request<any>('/settings', { method: 'POST', body: JSON.stringify(settings) }),
  reset: () => request<any>('/reset', { method: 'POST' }),
};
