import { ChatMessage, ChatMessageData, MessageType } from './ChatMessage';

export class ChatContainer {
  private element: HTMLElement;
  private messagesContainer: HTMLElement;
  private inputContainer: HTMLElement;
  private messageInput: HTMLInputElement;
  private sendButton: HTMLButtonElement;
  private typingIndicator: HTMLElement;
  private currentAiMessage: ChatMessage | null = null;
  private onSendCallback?: (text: string) => void;

  constructor(container: HTMLElement) {
    this.element = this.createElement();
    container.appendChild(this.element);
    this.initializeElements();
    this.setupEventListeners();
  }

  private createElement(): HTMLElement {
    const chatContainer = document.createElement('div');
    chatContainer.className = 'flex flex-col h-full';
    
    chatContainer.innerHTML = `
      <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-2 bg-[var(--bg-primary)]"></div>
      
      <div id="typing-indicator" class="hidden px-4 py-2">
        <div class="flex justify-start">
          <div class="max-w-xs lg:max-w-md bg-[var(--bg-tertiary)] rounded-lg p-3">
            <div class="text-xs text-[var(--text-secondary)] mb-1">Gemini</div>
            <div class="text-[var(--text-primary)]">
              Đang trả lời<span class="typing-dots"></span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="p-4 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <div class="flex space-x-2">
          <input
            type="text"
            id="message-input"
            placeholder="Nhập tin nhắn..."
            class="input-primary flex-1"
            disabled
          />
          <button
            id="send-button"
            class="btn-primary"
            disabled
          >
            Gửi
          </button>
        </div>
      </div>
    `;

    return chatContainer;
  }

  private initializeElements(): void {
    this.messagesContainer = this.element.querySelector('#chat-messages') as HTMLElement;
    this.inputContainer = this.element.querySelector('.input-container') as HTMLElement;
    this.messageInput = this.element.querySelector('#message-input') as HTMLInputElement;
    this.sendButton = this.element.querySelector('#send-button') as HTMLButtonElement;
    this.typingIndicator = this.element.querySelector('#typing-indicator') as HTMLElement;
    
    // Add welcome message
    this.addMessage('system', 'Chào mừng bạn đến với Gemini Live Chat! Nhấn "Kết nối" để bắt đầu trò chuyện.');
  }

  private setupEventListeners(): void {
    this.sendButton.addEventListener('click', () => {
      this.sendMessage();
    });

    this.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  }

  private sendMessage(): void {
    const text = this.messageInput.value.trim();
    if (!text || this.sendButton.disabled) return;
    
    this.onSendCallback?.(text);
    this.messageInput.value = '';
  }

  public addMessage(type: MessageType, content: string): void {
    const messageData: ChatMessageData = {
      type,
      content,
      timestamp: new Date()
    };
    
    const message = new ChatMessage(messageData);
    this.messagesContainer.appendChild(message.getElement());
    this.scrollToBottom();
    
    return;
  }

  public appendToAiMessage(text: string): void {
    if (!this.currentAiMessage) {
      const messageData: ChatMessageData = {
        type: 'ai',
        content: '',
        timestamp: new Date()
      };
      
      this.currentAiMessage = new ChatMessage(messageData);
      this.messagesContainer.appendChild(this.currentAiMessage.getElement());
    }
    
    this.currentAiMessage.appendContent(text);
    this.scrollToBottom();
  }

  public finishAiMessage(): void {
    this.currentAiMessage = null;
  }

  public showTypingIndicator(): void {
    this.typingIndicator.classList.remove('hidden');
    this.scrollToBottom();
  }

  public hideTypingIndicator(): void {
    this.typingIndicator.classList.add('hidden');
  }

  public scrollToBottom(): void {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  public setInputEnabled(enabled: boolean): void {
    this.messageInput.disabled = !enabled;
    this.sendButton.disabled = !enabled;
  }

  public onSend(callback: (text: string) => void): void {
    this.onSendCallback = callback;
  }
}
