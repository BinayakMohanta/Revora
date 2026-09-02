import { generateTransactions } from './generateTransactions';
import { AuditEvent, RecoveryPolicySettings, Transaction } from '../types';

export interface AppSettings extends RecoveryPolicySettings {
  razorpayKeyId: string;
  aiProvider: 'demo' | 'openai' | 'anthropic';
}

class Store {
  settings: AppSettings = {
    maxRetries: 2,
    maxContacts: 2,
    minRecoveryProbability: 50,
    highValueThreshold: 25000,
    cooldownMinutes: 30,
    autonomousMode: true,
    requireApprovalHighValue: true,
    auditLogging: true,
    demoMode: true,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    aiProvider: (process.env.AI_PROVIDER as any) || 'demo',
  };

  transactions: Transaction[] = generateTransactions(100, 42, this.settings);
  globalAudit: AuditEvent[] = [];

  constructor() {
    for (const txn of this.transactions) {
      this.globalAudit.push(...txn.auditEvents);
    }
    this.globalAudit.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  reset() {
    this.transactions = generateTransactions(100, 42, this.settings);
    this.globalAudit = [];
    for (const txn of this.transactions) this.globalAudit.push(...txn.auditEvents);
    this.globalAudit.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  addAudit(event: AuditEvent) {
    this.globalAudit.push(event);
    const txn = this.transactions.find((t) => t.id === event.transactionId);
    if (txn) txn.auditEvents.push(event);
  }

  getTransaction(id: string) {
    return this.transactions.find((t) => t.id === id);
  }
}

export const store = new Store();
