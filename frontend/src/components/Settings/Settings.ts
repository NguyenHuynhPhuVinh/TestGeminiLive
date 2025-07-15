export interface SettingsData {
  serverUrl: string;
  systemInstruction: string;
  maxFrames: number;
  frameQuality: number;
  frameInterval: number;
}

export class Settings {
  private element: HTMLElement;
  private modal: HTMLElement;
  private isVisible = false;
  private settings: SettingsData;
  private onSaveCallback?: (settings: SettingsData) => void;

  constructor(container: HTMLElement) {
    this.settings = this.getDefaultSettings();
    this.element = this.createElement();
    container.appendChild(this.element);
    this.setupEventListeners();
  }

  private getDefaultSettings(): SettingsData {
    return {
      serverUrl: 'http://localhost:5000',
      systemInstruction: 'Bạn là một trợ lý AI thông minh có thể xem và phân tích hình ảnh từ màn hình người dùng. Khi nhận được hình ảnh, hãy mô tả chi tiết và chính xác những gì bạn thấy. Trả lời bằng tiếng Việt thân thiện, cụ thể và hữu ích.',
      maxFrames: 30,
      frameQuality: 0.7,
      frameInterval: 2000
    };
  }

  private createElement(): HTMLElement {
    const settingsModal = document.createElement('div');
    settingsModal.className = 'fixed inset-0 modal-backdrop hidden flex items-center justify-center z-50';
    
    settingsModal.innerHTML = `
      <div class="modal-content p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold text-[var(--text-primary)]">Cài đặt</h2>
          <button class="btn-icon" id="close-settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <form id="settings-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Server URL
            </label>
            <input
              type="text"
              id="server-url"
              class="input-primary w-full"
              placeholder="http://localhost:5000"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">
              System Instruction
            </label>
            <textarea
              id="system-instruction"
              rows="4"
              class="input-primary w-full resize-none"
              placeholder="Hướng dẫn cho AI..."
            ></textarea>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Max Frames
              </label>
              <input
                type="number"
                id="max-frames"
                min="10"
                max="60"
                class="input-primary w-full"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Frame Quality
              </label>
              <input
                type="range"
                id="frame-quality"
                min="0.1"
                max="1"
                step="0.1"
                class="w-full"
              />
              <div class="text-xs text-[var(--text-secondary)] mt-1" id="quality-value">0.7</div>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Frame Interval (ms)
            </label>
            <input
              type="number"
              id="frame-interval"
              min="1000"
              max="10000"
              step="500"
              class="input-primary w-full"
            />
          </div>
          
          <div class="flex justify-end space-x-2 pt-4">
            <button type="button" class="btn-secondary" id="cancel-settings">
              Hủy
            </button>
            <button type="button" class="btn-primary" id="save-settings">
              Lưu
            </button>
          </div>
        </form>
      </div>
    `;

    return settingsModal;
  }

  private setupEventListeners(): void {
    const closeBtn = this.element.querySelector('#close-settings') as HTMLButtonElement;
    const cancelBtn = this.element.querySelector('#cancel-settings') as HTMLButtonElement;
    const saveBtn = this.element.querySelector('#save-settings') as HTMLButtonElement;
    const qualitySlider = this.element.querySelector('#frame-quality') as HTMLInputElement;
    const qualityValue = this.element.querySelector('#quality-value') as HTMLElement;

    closeBtn.addEventListener('click', () => this.hide());
    cancelBtn.addEventListener('click', () => this.hide());
    saveBtn.addEventListener('click', () => this.saveSettings());

    qualitySlider.addEventListener('input', () => {
      qualityValue.textContent = qualitySlider.value;
    });

    // Close on backdrop click
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) {
        this.hide();
      }
    });
  }

  public show(): void {
    this.populateForm();
    this.element.classList.remove('hidden');
    this.isVisible = true;
  }

  public hide(): void {
    this.element.classList.add('hidden');
    this.isVisible = false;
  }

  private populateForm(): void {
    const serverUrlInput = this.element.querySelector('#server-url') as HTMLInputElement;
    const systemInstructionInput = this.element.querySelector('#system-instruction') as HTMLTextAreaElement;
    const maxFramesInput = this.element.querySelector('#max-frames') as HTMLInputElement;
    const frameQualityInput = this.element.querySelector('#frame-quality') as HTMLInputElement;
    const frameIntervalInput = this.element.querySelector('#frame-interval') as HTMLInputElement;
    const qualityValue = this.element.querySelector('#quality-value') as HTMLElement;

    serverUrlInput.value = this.settings.serverUrl;
    systemInstructionInput.value = this.settings.systemInstruction;
    maxFramesInput.value = this.settings.maxFrames.toString();
    frameQualityInput.value = this.settings.frameQuality.toString();
    frameIntervalInput.value = this.settings.frameInterval.toString();
    qualityValue.textContent = this.settings.frameQuality.toString();
  }

  private saveSettings(): void {
    const serverUrlInput = this.element.querySelector('#server-url') as HTMLInputElement;
    const systemInstructionInput = this.element.querySelector('#system-instruction') as HTMLTextAreaElement;
    const maxFramesInput = this.element.querySelector('#max-frames') as HTMLInputElement;
    const frameQualityInput = this.element.querySelector('#frame-quality') as HTMLInputElement;
    const frameIntervalInput = this.element.querySelector('#frame-interval') as HTMLInputElement;

    this.settings = {
      serverUrl: serverUrlInput.value.trim() || this.settings.serverUrl,
      systemInstruction: systemInstructionInput.value.trim() || this.settings.systemInstruction,
      maxFrames: parseInt(maxFramesInput.value) || this.settings.maxFrames,
      frameQuality: parseFloat(frameQualityInput.value) || this.settings.frameQuality,
      frameInterval: parseInt(frameIntervalInput.value) || this.settings.frameInterval
    };

    this.onSaveCallback?.(this.settings);
    this.hide();
  }

  public getSettings(): SettingsData {
    return { ...this.settings };
  }

  public onSave(callback: (settings: SettingsData) => void): void {
    this.onSaveCallback = callback;
  }
}
