export interface ScreenSource {
  id: string;
  name: string;
  thumbnail?: string;
}

export class ScreenShare {
  private element: HTMLElement;
  private modal: HTMLElement;
  private sourceList: HTMLElement;
  private shareButton: HTMLButtonElement;
  private stopButton: HTMLButtonElement;
  private statusElement: HTMLElement;
  private isSharing = false;
  private onStartCallback?: (sourceId: string) => void;
  private onStopCallback?: () => void;

  constructor(container: HTMLElement) {
    this.element = this.createElement();
    container.appendChild(this.element);
    this.initializeElements();
    this.setupEventListeners();
  }

  private createElement(): HTMLElement {
    const screenShareContainer = document.createElement('div');
    screenShareContainer.className = 'p-4 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]';
    
    screenShareContainer.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-2">
          <button
            id="share-button"
            class="btn-secondary"
            disabled
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            Chia sẻ màn hình
          </button>
          
          <button
            id="stop-button"
            class="btn-secondary hidden"
            disabled
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-2">
              <rect x="6" y="6" width="12" height="12"></rect>
            </svg>
            Dừng
          </button>
        </div>
      </div>
      
      <div id="screen-status" class="text-xs text-[var(--text-secondary)]"></div>
      
      <!-- Source Selection Modal -->
      <div id="source-modal" class="fixed inset-0 modal-backdrop hidden flex items-center justify-center z-50">
        <div class="modal-content p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-[var(--text-primary)]">Chọn màn hình để chia sẻ</h3>
            <button class="btn-icon" id="close-source-modal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <div id="source-list" class="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            <!-- Sources will be populated here -->
          </div>
          
          <div class="flex justify-end gap-2 mt-4">
            <button id="cancel-source" class="btn-secondary">
              Hủy
            </button>
          </div>
        </div>
      </div>
    `;

    return screenShareContainer;
  }

  private initializeElements(): void {
    this.modal = this.element.querySelector('#source-modal') as HTMLElement;
    this.sourceList = this.element.querySelector('#source-list') as HTMLElement;
    this.shareButton = this.element.querySelector('#share-button') as HTMLButtonElement;
    this.stopButton = this.element.querySelector('#stop-button') as HTMLButtonElement;
    this.statusElement = this.element.querySelector('#screen-status') as HTMLElement;
  }

  private setupEventListeners(): void {
    const closeModalBtn = this.element.querySelector('#close-source-modal') as HTMLButtonElement;
    const cancelBtn = this.element.querySelector('#cancel-source') as HTMLButtonElement;

    this.shareButton.addEventListener('click', () => {
      this.showSourceSelection();
    });

    this.stopButton.addEventListener('click', () => {
      this.stopSharing();
    });

    closeModalBtn.addEventListener('click', () => {
      this.hideSourceModal();
    });

    cancelBtn.addEventListener('click', () => {
      this.hideSourceModal();
    });

    // Close modal on backdrop click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hideSourceModal();
      }
    });
  }

  private async showSourceSelection(): Promise<void> {
    try {
      this.setStatus('Đang tải danh sách màn hình...');
      
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI) {
        throw new Error('Electron API không khả dụng');
      }

      const sources = await electronAPI.getDesktopSources();
      if (sources.length === 0) {
        throw new Error('Không tìm thấy nguồn màn hình');
      }

      this.populateSourceList(sources);
      this.showSourceModal();
      this.setStatus('Chọn màn hình để chia sẻ');
    } catch (error: any) {
      this.setStatus(`Lỗi: ${error.message}`);
    }
  }

  private populateSourceList(sources: ScreenSource[]): void {
    this.sourceList.innerHTML = '';

    sources.forEach((source) => {
      const sourceItem = document.createElement('div');
      sourceItem.className = 'border border-[var(--border-primary)] rounded-lg p-3 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors';

      const isScreen = source.id.startsWith('screen:');
      const icon = isScreen ? '🖥️' : '🪟';

      sourceItem.innerHTML = `
        <div class="flex items-center space-x-3">
          <div class="text-2xl">${icon}</div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm text-[var(--text-primary)] truncate">${source.name}</div>
            <div class="text-xs text-[var(--text-secondary)]">${isScreen ? 'Màn hình' : 'Cửa sổ'}</div>
          </div>
        </div>
      `;

      sourceItem.addEventListener('click', () => {
        this.selectSource(source);
      });

      this.sourceList.appendChild(sourceItem);
    });
  }

  private selectSource(source: ScreenSource): void {
    this.hideSourceModal();
    this.setStatus(`Đang kết nối với ${source.name}...`);
    this.onStartCallback?.(source.id);
  }

  private stopSharing(): void {
    this.onStopCallback?.();
  }

  private showSourceModal(): void {
    this.modal.classList.remove('hidden');
  }

  private hideSourceModal(): void {
    this.modal.classList.add('hidden');
    this.setStatus('');
  }

  public setStatus(status: string): void {
    this.statusElement.textContent = status;
  }

  public setEnabled(enabled: boolean): void {
    this.shareButton.disabled = !enabled;
  }

  public setSharingState(sharing: boolean, sourceName?: string): void {
    this.isSharing = sharing;
    
    if (sharing) {
      this.shareButton.classList.add('hidden');
      this.stopButton.classList.remove('hidden');
      this.stopButton.disabled = false;
      this.setStatus(sourceName ? `Đang chia sẻ: ${sourceName}` : 'Đang chia sẻ màn hình');
    } else {
      this.shareButton.classList.remove('hidden');
      this.stopButton.classList.add('hidden');
      this.stopButton.disabled = true;
      this.setStatus('');
    }
  }

  public onStart(callback: (sourceId: string) => void): void {
    this.onStartCallback = callback;
  }

  public onStop(callback: () => void): void {
    this.onStopCallback = callback;
  }
}
