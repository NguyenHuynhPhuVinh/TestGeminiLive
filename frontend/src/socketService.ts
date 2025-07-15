import { io, Socket } from 'socket.io-client';
import { ConnectionState } from './types';

class SocketService {
  private socket: Socket | null = null;
  private connectionState: ConnectionState = {
    isConnected: false,
    isConnecting: false
  };

  private onConnectionStateChange?: (state: ConnectionState) => void;
  private onTextChunkReceived?: (text: string) => void;
  private onTurnComplete?: () => void;

  connect(serverUrl: string = 'http://localhost:5000') {
    if (this.socket?.connected) {
      console.log('🔍 Already connected');
      return;
    }

    console.log('🔍 Connecting to server:', serverUrl);
    this.updateConnectionState({ isConnecting: true, isConnected: false });

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔍 SocketService connected');
      this.updateConnectionState({ isConnected: true, isConnecting: false });
    });

    this.socket.on('disconnect', () => {
      console.log('🔍 SocketService disconnected');
      this.updateConnectionState({ isConnected: false, isConnecting: false });
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔍 SocketService connection error:', error);
      this.updateConnectionState({ 
        isConnected: false, 
        isConnecting: false, 
        error: error.message 
      });
    });

    this.socket.on('textChunk', (data: { text: string }) => {
      console.log('🔍 SocketService received textChunk:', data);
      this.onTextChunkReceived?.(data.text);
    });

    this.socket.on('turnComplete', () => {
      console.log('🔍 SocketService received turnComplete');
      this.onTurnComplete?.();
    });

    this.socket.on('error', (data: { message: string }) => {
      console.error('🔍 SocketService error:', data);
      this.updateConnectionState({ 
        isConnected: false, 
        isConnecting: false, 
        error: data.message 
      });
    });
  }

  sendMessage(text: string) {
    if (!this.socket?.connected) {
      console.error('🔍 Cannot send message: not connected');
      return;
    }

    console.log('🔍 SocketService sending message:', text);
    this.socket.emit('sendMessage', { text });
  }

  onConnectionStateChanged(callback: (state: ConnectionState) => void) {
    this.onConnectionStateChange = callback;
    // Send current state immediately
    callback(this.connectionState);
  }

  onTextChunk(callback: (text: string) => void) {
    this.onTextChunkReceived = callback;
  }

  onTurnCompleted(callback: () => void) {
    this.onTurnComplete = callback;
  }

  private updateConnectionState(newState: Partial<ConnectionState>) {
    this.connectionState = { ...this.connectionState, ...newState };
    this.onConnectionStateChange?.(this.connectionState);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.updateConnectionState({ isConnected: false, isConnecting: false });
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }
}

export const socketService = new SocketService();
