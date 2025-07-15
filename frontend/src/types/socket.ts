// Socket.io Event Types (matching backend)
export interface ServerToClientEvents {
  connected: (data: { message: string }) => void;
  textChunk: (data: { text: string }) => void;
  turnComplete: () => void;
  processing: (data: { message: string }) => void;
  error: (data: { message: string }) => void;
  disconnected: (data: { message: string }) => void;
  videoReceived: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  connect_gemini: (data: ConnectGeminiData) => void;
  sendText: (data: SendTextData) => void;
  sendTextWithFrameSequence: (data: SendTextWithFrameSequenceData) => void;
  disconnect_gemini: () => void;
}

// Request/Response Types
export interface ConnectGeminiData {
  systemInstruction?: string;
}

export interface SendTextData {
  text: string;
}

export interface FrameData {
  data: string; // base64 encoded
  mimeType: string;
  timestamp: number;
  size: number;
}

export interface SendTextWithFrameSequenceData {
  text: string;
  frames: FrameData[];
  totalFrames: number;
  totalSize: number;
}

// UI Types
export interface Message {
  id: string;
  type: 'user' | 'ai' | 'system' | 'error';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isConnecting: boolean;
  error?: string;
}

export interface MediaState {
  isRecording: boolean;
  mediaStream: MediaStream | null;
  frameSequence: CapturedFrame[];
  status: string;
}

export interface CapturedFrame {
  blob: Blob;
  timestamp: number;
  size: number;
}
