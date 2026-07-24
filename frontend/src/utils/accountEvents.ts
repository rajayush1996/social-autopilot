// Realtime Cross-Tab & In-App Event Dispatcher for Social Account Connections

const CHANNEL_NAME = 'social_account_status_sync';

export interface AccountEventDetail {
  type: 'CONNECTED' | 'DISCONNECTED';
  platform?: string;
  timestamp: number;
}

class AccountEventService {
  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
    }
  }

  // Notify all tabs & components that an account was connected or disconnected
  public notifyAccountChange(type: 'CONNECTED' | 'DISCONNECTED', platform?: string) {
    const detail: AccountEventDetail = { type, platform, timestamp: Date.now() };

    // 1. Dispatch local window CustomEvent
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ACCOUNT_STATUS_CHANGE', { detail }));
    }

    // 2. Broadcast across browser tabs
    if (this.channel) {
      this.channel.postMessage(detail);
    }
  }

  // Listen for realtime account changes across tabs and local events
  public subscribe(callback: (detail: AccountEventDetail) => void) {
    if (typeof window === 'undefined') return () => {};

    const handleLocalEvent = (e: Event) => {
      const customEvent = e as CustomEvent<AccountEventDetail>;
      callback(customEvent.detail);
    };

    const handleBroadcast = (e: MessageEvent<AccountEventDetail>) => {
      callback(e.data);
    };

    window.addEventListener('ACCOUNT_STATUS_CHANGE', handleLocalEvent);

    if (this.channel) {
      this.channel.addEventListener('message', handleBroadcast);
    }

    return () => {
      window.removeEventListener('ACCOUNT_STATUS_CHANGE', handleLocalEvent);
      if (this.channel) {
        this.channel.removeEventListener('message', handleBroadcast);
      }
    };
  }
}

export const accountEvents = new AccountEventService();
export default accountEvents;
