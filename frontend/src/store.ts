import { Message, ConnectionState } from './types';

class Store {
  private messages: Message[] = [];
  private currentAiMessage: string = '';
  private connectionState: ConnectionState = {
    isConnected: false,
    isConnecting: false
  };

  // Callbacks
  private onMessagesChange?: (messages: Message[]) => void;
  private onCurrentAiMessageChange?: (message: string) => void;
  private onConnectionStateChange?: (state: ConnectionState) => void;

  // Messages
  addUserMessage(content: string) {
    console.log('🔍 Store addUserMessage called with:', content);
    const message: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    };
    this.messages.push(message);
    this.onMessagesChange?.(this.messages);
  }

  updateCurrentAiMessage(text: string) {
    console.log('🔍 Store updateCurrentAiMessage called with:', text);
    this.currentAiMessage += text;
    this.onCurrentAiMessageChange?.(this.currentAiMessage);
  }

  completeAiMessage() {
    console.log('🔍 Store completeAiMessage called');
    if (this.currentAiMessage.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: this.currentAiMessage.trim(),
        timestamp: new Date()
      };
      this.messages.push(message);
      this.currentAiMessage = '';
      this.onMessagesChange?.(this.messages);
      this.onCurrentAiMessageChange?.('');
    }
  }

  // Connection State
  updateConnectionState(state: ConnectionState) {
    console.log('🔍 Store updateConnectionState called with:', state);
    this.connectionState = state;
    this.onConnectionStateChange?.(state);
  }

  // Subscriptions
  onMessagesChanged(callback: (messages: Message[]) => void) {
    this.onMessagesChange = callback;
    // Send current state immediately
    callback(this.messages);
  }

  onCurrentAiMessageChanged(callback: (message: string) => void) {
    this.onCurrentAiMessageChange = callback;
    // Send current state immediately
    callback(this.currentAiMessage);
  }

  onConnectionStateChanged(callback: (state: ConnectionState) => void) {
    this.onConnectionStateChange = callback;
    // Send current state immediately
    callback(this.connectionState);
  }

  // Getters
  getMessages(): Message[] {
    return this.messages;
  }

  getCurrentAiMessage(): string {
    return this.currentAiMessage;
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }
}

export const store = new Store();
