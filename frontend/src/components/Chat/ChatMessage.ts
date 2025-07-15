export type MessageType = 'user' | 'ai' | 'system' | 'error';

export interface ChatMessageData {
  type: MessageType;
  content: string;
  timestamp: Date;
}

export class ChatMessage {
  private element: HTMLElement;
  private contentElement: HTMLElement;
  private messageData: ChatMessageData;

  constructor(messageData: ChatMessageData) {
    this.messageData = messageData;
    this.element = this.createElement();
    this.contentElement = this.element.querySelector('.message-content') as HTMLElement;
  }

  private createElement(): HTMLElement {
    const { type, content, timestamp } = this.messageData;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `flex ${type === 'user' ? 'justify-end' : 'justify-start'} mb-4 fade-in`;
    
    const messageContent = document.createElement('div');
    let messageClass = '';
    
    switch (type) {
      case 'user':
        messageClass = 'bg-[var(--accent-primary)] text-white';
        break;
      case 'ai':
        messageClass = 'bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] text-[var(--text-primary)]';
        break;
      case 'system':
        messageClass = 'bg-[var(--bg-tertiary)] border-l-4 border-[var(--warning)] text-[var(--text-secondary)]';
        break;
      case 'error':
        messageClass = 'bg-[var(--bg-tertiary)] border-l-4 border-[var(--error)] text-[var(--text-secondary)]';
        break;
    }
    
    messageContent.className = `max-w-xs lg:max-w-md rounded-lg p-3 shadow-sm ${messageClass}`;
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'text-xs opacity-70 mb-1';
    timeDiv.textContent = timestamp.toLocaleTimeString();
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    messageContent.appendChild(timeDiv);
    messageContent.appendChild(contentDiv);
    messageDiv.appendChild(messageContent);
    
    return messageDiv;
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public appendContent(text: string): void {
    this.messageData.content += text;
    this.contentElement.textContent = this.messageData.content;
  }

  public getContent(): string {
    return this.messageData.content;
  }
}
