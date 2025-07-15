export interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error?: string;
}

export interface SocketEvents {
  // Client to Server
  sendMessage: (data: { text: string }) => void;
  
  // Server to Client
  textChunk: (data: { text: string }) => void;
  turnComplete: () => void;
  connected: () => void;
  disconnected: () => void;
  error: (data: { message: string }) => void;
}
