// Socket.io Event Types
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

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId?: string;
  geminiSession?: any;
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

// Gemini API Types
export interface GeminiConfig {
  responseModalities: any[]; // Use any[] to match Gemini SDK types
  systemInstruction: string;
}

export interface GeminiMessage {
  text?: string;
  serverContent?: {
    modelTurn?: {
      parts: Array<{ text?: string }>;
    };
    turnComplete?: boolean;
  };
}

// Error Types
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

// Environment Variables
export interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  HOST: string;
  FRONTEND_URL: string;
  GEMINI_API_KEY: string;
  GEMINI_MODEL: string;
  SOCKET_CORS_ORIGIN: string;
  MAX_FRAME_SIZE: number;
  MAX_FRAMES_PER_REQUEST: number;
  FRAME_QUALITY: number;
  LOG_LEVEL: string;
}
