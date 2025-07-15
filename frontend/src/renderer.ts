import "./index.css";
import { socketService } from "./socketService";

console.log("👋 Gemini Live Chat Renderer Started");

class GeminiLiveChatApp {
  // DOM Elements
  private messageInput: HTMLInputElement;
  private sendButton: HTMLButtonElement;
  private chatMessages: HTMLElement;
  private statusIndicator: HTMLElement;
  private statusText: HTMLElement;
  private connectButton: HTMLButtonElement;
  private screenButton: HTMLButtonElement;
  private stopButton: HTMLButtonElement;
  private mediaStatus: HTMLElement;
  private typingIndicator: HTMLElement;

  // State
  private isSocketConnected = false;
  private isGeminiConnected = false;
  private isWaitingResponse = false;
  private currentAiMessage: HTMLElement | null = null;
  private currentAiContent = "";

  // Media capture
  private mediaStream: MediaStream | null = null;
  private isRecording = false;
  private frameSequence: any[] = [];
  private maxFrames = 30;
  private frameInterval: number | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor() {
    this.messageInput = document.getElementById(
      "message-input"
    ) as HTMLInputElement;
    this.sendButton = document.getElementById(
      "send-button"
    ) as HTMLButtonElement;
    this.chatMessages = document.getElementById("chat-messages") as HTMLElement;
    this.statusIndicator = document.getElementById(
      "status-indicator"
    ) as HTMLElement;
    this.statusText = document.getElementById("status-text") as HTMLElement;
    this.connectButton = document.getElementById(
      "connect-button"
    ) as HTMLButtonElement;
    this.screenButton = document.getElementById(
      "screen-button"
    ) as HTMLButtonElement;
    this.stopButton = document.getElementById(
      "stop-button"
    ) as HTMLButtonElement;
    this.mediaStatus = document.getElementById("media-status") as HTMLElement;
    this.typingIndicator = document.getElementById(
      "typing-indicator"
    ) as HTMLElement;

    this.init();
  }

  private init() {
    console.log("🔍 GeminiLiveChatApp initializing...");

    // Setup event listeners
    this.setupEventListeners();

    // Setup socket subscriptions
    this.setupSocketSubscriptions();

    // Connect to server
    socketService.connect();
  }

  private setupEventListeners() {
    // Connect button
    this.connectButton.addEventListener("click", () => {
      this.toggleGeminiConnection();
    });

    // Send button click
    this.sendButton.addEventListener("click", () => {
      this.sendMessage();
    });

    // Enter key in input
    this.messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Screen share button
    this.screenButton.addEventListener("click", () => {
      this.startScreenShare();
    });

    // Stop button
    this.stopButton.addEventListener("click", () => {
      this.stopCapture();
    });
  }

  private setupSocketSubscriptions() {
    // Socket connection state changes
    socketService.onConnectionStateChanged((state) => {
      this.isSocketConnected = state.isConnected;
      this.updateSocketStatus(state);
    });

    // Gemini connected
    socketService.onGeminiConnectedCallback((message) => {
      this.isGeminiConnected = true;
      this.updateGeminiStatus("🟢 " + message, true);
      this.addMessage("ai", message);
    });

    // Text chunks from AI
    socketService.onTextChunk((text) => {
      this.hideTypingIndicator();
      this.appendToAiMessage(text);
    });

    // Turn complete
    socketService.onTurnCompleted(() => {
      this.finishAiMessage();
      this.isWaitingResponse = false;
      this.sendButton.disabled = false;
    });

    // Gemini error
    socketService.onGeminiErrorCallback((message) => {
      this.hideTypingIndicator();
      this.addMessage("error", message);
      this.isWaitingResponse = false;
      this.sendButton.disabled = false;
    });

    // Processing
    socketService.onProcessingCallback((message) => {
      this.showTypingIndicator();
    });
  }

  private toggleGeminiConnection() {
    if (this.isGeminiConnected) {
      this.disconnectGemini();
    } else {
      this.connectToGemini();
    }
  }

  private connectToGemini() {
    if (!this.isSocketConnected) {
      this.addMessage("error", "Chưa kết nối với server");
      return;
    }

    this.updateGeminiStatus("🟡 Đang kết nối Gemini...", false);
    this.connectButton.disabled = true;
    socketService.connectToGemini();
  }

  private disconnectGemini() {
    this.isGeminiConnected = false;
    this.updateGeminiStatus("🔴 Chưa kết nối", false);
    this.connectButton.textContent = "Kết nối";
    this.connectButton.disabled = false;
    this.stopCapture();
  }

  private sendMessage() {
    const text = this.messageInput.value.trim();
    if (!text || !this.isGeminiConnected || this.isWaitingResponse) return;

    this.addMessage("user", text);

    // Thông báo nếu đang gửi kèm video
    if (this.isRecording) {
      this.addMessage(
        "system",
        "📹 Đang gửi câu hỏi kèm video context đến Gemini..."
      );
    }

    this.messageInput.value = "";
    this.isWaitingResponse = true;
    this.sendButton.disabled = true;

    // Gửi tin nhắn (tạm thời chỉ text, sẽ thêm frames sau)
    socketService.sendMessage(text);
  }

  // UI Methods
  private updateSocketStatus(state: any) {
    if (state.isConnecting) {
      this.statusIndicator.className = "w-3 h-3 rounded-full bg-yellow-500";
      this.statusText.textContent = "🟡 Đang kết nối server...";
    } else if (state.isConnected) {
      this.statusIndicator.className = "w-3 h-3 rounded-full bg-green-500";
      this.statusText.textContent = "🟢 Đã kết nối server";
      this.connectButton.disabled = false;
    } else {
      this.statusIndicator.className = "w-3 h-3 rounded-full bg-red-500";
      this.statusText.textContent = "🔴 Mất kết nối server";
      this.connectButton.disabled = true;
      this.messageInput.disabled = true;
      this.sendButton.disabled = true;
      this.screenButton.disabled = true;
    }
  }

  private updateGeminiStatus(text: string, connected: boolean) {
    this.statusText.textContent = text;
    if (connected) {
      this.connectButton.textContent = "Ngắt kết nối";
      this.connectButton.disabled = false;
      this.messageInput.disabled = false;
      this.sendButton.disabled = false;
      this.screenButton.disabled = false;
    } else {
      this.connectButton.textContent = "Kết nối";
      this.messageInput.disabled = true;
      this.sendButton.disabled = true;
      this.screenButton.disabled = true;
    }
  }

  private addMessage(type: string, content: string) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `flex ${
      type === "user" ? "justify-end" : "justify-start"
    }`;

    const messageContent = document.createElement("div");
    let bgClass = "";
    if (type === "user") {
      bgClass = "bg-blue-600 text-white";
    } else if (type === "error") {
      bgClass = "bg-red-100 text-red-800 border border-red-200";
    } else if (type === "system") {
      bgClass = "bg-yellow-100 text-yellow-800 border border-yellow-200";
    } else {
      bgClass = "bg-white border border-gray-200 text-gray-800";
    }

    messageContent.className = `max-w-xs lg:max-w-md rounded-lg p-4 shadow-sm ${bgClass}`;

    const timeDiv = document.createElement("div");
    timeDiv.className = "text-xs opacity-70 mb-1";
    timeDiv.textContent = new Date().toLocaleTimeString();

    const contentDiv = document.createElement("div");
    contentDiv.textContent = content;

    messageContent.appendChild(timeDiv);
    messageContent.appendChild(contentDiv);
    messageDiv.appendChild(messageContent);

    this.chatMessages.appendChild(messageDiv);
    this.scrollToBottom();
  }

  private appendToAiMessage(text: string) {
    if (!this.currentAiMessage) {
      // Tạo message mới cho AI
      this.currentAiMessage = document.createElement("div");
      this.currentAiMessage.className = "flex justify-start";

      const messageContent = document.createElement("div");
      messageContent.className =
        "max-w-xs lg:max-w-md bg-white border border-gray-200 rounded-lg p-4 shadow-sm border-l-4 border-blue-500";

      const timeDiv = document.createElement("div");
      timeDiv.className = "text-xs opacity-70 mb-1";
      timeDiv.textContent = new Date().toLocaleTimeString();

      const contentDiv = document.createElement("div");
      contentDiv.className = "message-content";

      messageContent.appendChild(timeDiv);
      messageContent.appendChild(contentDiv);
      this.currentAiMessage.appendChild(messageContent);
      this.chatMessages.appendChild(this.currentAiMessage);

      this.currentAiContent = "";
    }

    // Append text vào content hiện tại
    this.currentAiContent += text;
    const contentDiv = this.currentAiMessage.querySelector(
      ".message-content"
    ) as HTMLElement;
    contentDiv.textContent = this.currentAiContent;

    this.scrollToBottom();
  }

  private finishAiMessage() {
    this.currentAiMessage = null;
    this.currentAiContent = "";
  }

  private showTypingIndicator() {
    this.typingIndicator.classList.remove("hidden");
    this.scrollToBottom();
  }

  private hideTypingIndicator() {
    this.typingIndicator.classList.add("hidden");
  }

  private scrollToBottom() {
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  // Media Methods (placeholder for now)
  private async startScreenShare() {
    try {
      this.mediaStatus.textContent =
        "🔄 Đang yêu cầu quyền chia sẻ màn hình...";

      // TODO: Implement screen sharing logic
      this.mediaStatus.textContent =
        "📹 Tính năng chia sẻ màn hình sẽ được thêm sau";
    } catch (error: any) {
      this.mediaStatus.textContent =
        "❌ Không thể chia sẻ màn hình: " + error.message;
    }
  }

  private stopCapture() {
    this.isRecording = false;
    this.frameSequence = [];
    this.mediaStatus.textContent = "";

    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.updateMediaButtons(false);
  }

  private updateMediaButtons(isRecording: boolean) {
    this.screenButton.disabled = isRecording || !this.isGeminiConnected;
    this.stopButton.disabled = !isRecording;
    this.stopButton.style.display = isRecording ? "inline-block" : "none";
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new GeminiLiveChatApp();
});
