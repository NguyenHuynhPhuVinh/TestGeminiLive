"use client";

import io from "socket.io-client";
import {
  ServerToClientEvents,
  ClientToServerEvents,
  ConnectGeminiData,
  SendTextData,
  SendTextWithFrameSequenceData,
} from "@/types/socket";

// Define Socket type interface
interface SocketType {
  connected: boolean;
  emit: (event: string, ...args: any[]) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeAllListeners: () => void;
  disconnect: () => void;
}

class SocketService {
  private socket: SocketType | null = null;
  private readonly serverUrl: string;

  constructor() {
    this.serverUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
  }

  connect(): Promise<SocketType> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve(this.socket);
        return;
      }

      console.log("🔗 Connecting to Socket.io server:", this.serverUrl);

      this.socket = io(this.serverUrl, {
        transports: ["websocket", "polling"],
        timeout: 10000,
        forceNew: true,
      });

      this.socket.on("connect", () => {
        console.log("✅ Connected to Socket.io server");
        resolve(this.socket!);
      });

      this.socket.on("connect_error", (error: any) => {
        console.error("❌ Socket.io connection error:", error);
        reject(error);
      });

      this.socket.on("disconnect", (reason: any) => {
        console.log("🔌 Disconnected from Socket.io server:", reason);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      console.log("🔌 Disconnecting from Socket.io server");
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Gemini Live methods
  async connectGemini(data: ConnectGeminiData): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }

    console.log("🤖 Connecting to Gemini Live...");
    this.socket.emit("connect_gemini", data);
  }

  async sendText(data: SendTextData): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }

    console.log("📤 Sending text:", data.text);
    this.socket.emit("sendText", data);
  }

  async sendTextWithFrameSequence(
    data: SendTextWithFrameSequenceData
  ): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }

    console.log(`📤 Sending text with ${data.totalFrames} frames:`, data.text);
    this.socket.emit("sendTextWithFrameSequence", data);
  }

  async disconnectGemini(): Promise<void> {
    if (!this.socket?.connected) {
      return;
    }

    console.log("🔌 Disconnecting from Gemini Live...");
    this.socket.emit("disconnect_gemini");
  }

  // Event listeners
  onConnected(callback: (data: { message: string }) => void): void {
    this.socket?.on("connected", callback);
  }

  onTextChunk(callback: (data: { text: string }) => void): void {
    this.socket?.on("textChunk", callback);
  }

  onTurnComplete(callback: () => void): void {
    this.socket?.on("turnComplete", callback);
  }

  onProcessing(callback: (data: { message: string }) => void): void {
    this.socket?.on("processing", callback);
  }

  onError(callback: (data: { message: string }) => void): void {
    this.socket?.on("error", callback);
  }

  onDisconnected(callback: (data: { message: string }) => void): void {
    this.socket?.on("disconnected", callback);
  }

  onVideoReceived(callback: (data: { message: string }) => void): void {
    this.socket?.on("videoReceived", callback);
  }

  // Remove listeners
  removeAllListeners(): void {
    this.socket?.removeAllListeners();
  }

  // Get connection status
  get isConnected(): boolean {
    return this.socket?.connected || false;
  }

  get socket_instance(): SocketType | null {
    return this.socket;
  }
}

// Singleton instance
export const socketService = new SocketService();
