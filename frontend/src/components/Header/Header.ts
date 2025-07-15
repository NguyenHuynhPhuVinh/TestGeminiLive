export interface HeaderState {
  isSocketConnected: boolean;
  isGeminiConnected: boolean;
  statusText: string;
}

export class Header {
  private element: HTMLElement;
  private statusIndicator: HTMLElement;
  private statusText: HTMLElement;
  private connectButton: HTMLButtonElement;
  private settingsButton: HTMLButtonElement;
  private onConnectCallback?: () => void;
  private onSettingsCallback?: () => void;

  constructor(container: HTMLElement) {
    this.element = this.createElement();
    container.appendChild(this.element);
    this.initializeElements();
    this.setupEventListeners();
  }

  private createElement(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between p-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]';
    
    header.innerHTML = `
      <div class="flex items-center space-x-3">
        <div class="flex items-center space-x-2">
          <div class="w-2 h-2 rounded-full bg-[var(--error)]" id="status-indicator"></div>
          <span class="text-sm text-[var(--text-secondary)]" id="status-text">Chưa kết nối</span>
        </div>
      </div>
      
      <div class="flex items-center space-x-2">
        <button class="btn-secondary" id="connect-button" disabled>
          Kết nối
        </button>
        <button class="btn-icon" id="settings-button" title="Cài đặt">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m17-4a4 4 0 01-8 0m-6 0a4 4 0 018 0"></path>
          </svg>
        </button>
      </div>
    `;

    return header;
  }

  private initializeElements(): void {
    this.statusIndicator = this.element.querySelector('#status-indicator') as HTMLElement;
    this.statusText = this.element.querySelector('#status-text') as HTMLElement;
    this.connectButton = this.element.querySelector('#connect-button') as HTMLButtonElement;
    this.settingsButton = this.element.querySelector('#settings-button') as HTMLButtonElement;
  }

  private setupEventListeners(): void {
    this.connectButton.addEventListener('click', () => {
      this.onConnectCallback?.();
    });

    this.settingsButton.addEventListener('click', () => {
      this.onSettingsCallback?.();
    });
  }

  public updateState(state: HeaderState): void {
    // Update status indicator
    if (state.isSocketConnected && state.isGeminiConnected) {
      this.statusIndicator.className = 'w-2 h-2 rounded-full bg-[var(--success)]';
      this.connectButton.textContent = 'Ngắt kết nối';
      this.connectButton.disabled = false;
    } else if (state.isSocketConnected) {
      this.statusIndicator.className = 'w-2 h-2 rounded-full bg-[var(--warning)]';
      this.connectButton.textContent = 'Kết nối';
      this.connectButton.disabled = false;
    } else {
      this.statusIndicator.className = 'w-2 h-2 rounded-full bg-[var(--error)]';
      this.connectButton.textContent = 'Kết nối';
      this.connectButton.disabled = true;
    }

    this.statusText.textContent = state.statusText;
  }

  public onConnect(callback: () => void): void {
    this.onConnectCallback = callback;
  }

  public onSettings(callback: () => void): void {
    this.onSettingsCallback = callback;
  }

  public setConnectButtonLoading(loading: boolean): void {
    this.connectButton.disabled = loading;
    if (loading) {
      this.connectButton.textContent = 'Đang kết nối...';
    }
  }
}
