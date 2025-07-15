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

  // Source selection modal
  private sourceModal: HTMLElement;
  private sourceList: HTMLElement;
  private cancelSourceButton: HTMLButtonElement;

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
  private frameInterval: NodeJS.Timeout | null = null;
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

    // Source selection modal elements
    this.sourceModal = document.getElementById("source-modal") as HTMLElement;
    this.sourceList = document.getElementById("source-list") as HTMLElement;
    this.cancelSourceButton = document.getElementById(
      "cancel-source"
    ) as HTMLButtonElement;

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

    // Cancel source selection
    this.cancelSourceButton.addEventListener("click", () => {
      this.hideSourceModal();
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

    // Video received
    socketService.onVideoReceivedCallback((message) => {
      this.addMessage("ai", "✅ " + message);
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

    // Gửi tin nhắn với hoặc không có frames
    if (this.isRecording && this.frameSequence.length > 0) {
      this.sendTextWithFrameSequence(text, this.frameSequence);
      // Xóa tất cả frames cũ và bắt đầu sequence mới
      this.clearFrameSequence();
    } else {
      // Chỉ gửi text nếu không có frames
      socketService.sendMessage(text);
    }
  }

  private async sendTextWithFrameSequence(text: string, frameSequence: any[]) {
    try {
      console.log(`📤 Sending text with ${frameSequence.length} frames:`, text);

      // Convert tất cả frames thành base64
      const frameDataArray = [];
      let totalSize = 0;

      for (let i = 0; i < frameSequence.length; i++) {
        const frame = frameSequence[i];
        const arrayBuffer = await frame.blob.arrayBuffer();
        const base64Data = btoa(
          String.fromCharCode(...new Uint8Array(arrayBuffer))
        );

        frameDataArray.push({
          data: base64Data,
          mimeType: frame.blob.type,
          timestamp: frame.timestamp,
          size: frame.size,
        });

        totalSize += frame.size;
      }

      console.log(
        `📊 Total frames: ${frameSequence.length}, Total size: ${Math.round(
          totalSize / 1024
        )}KB`
      );

      // Gửi text kèm tất cả frames
      socketService.sendMessageWithFrames(text, frameDataArray);
    } catch (error) {
      console.error("Error sending text with frame sequence:", error);
      // Fallback: chỉ gửi text
      socketService.sendMessage(text);
    }
  }

  private clearFrameSequence() {
    console.log(`🗑️ Clearing ${this.frameSequence.length} old frames`);
    this.frameSequence = [];
    this.mediaStatus.textContent =
      "📸 Đã xóa frames cũ - Đang thu thập frames mới...";
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

  // Media Methods - Show source selection modal
  private async startScreenShare() {
    try {
      this.mediaStatus.textContent = "🔄 Đang tải danh sách màn hình...";

      console.log("🔍 Getting available desktop sources");

      // Check if electronAPI is available
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI) {
        throw new Error("Electron API không khả dụng");
      }

      // Get available desktop sources
      const sources = await electronAPI.getDesktopSources();
      console.log("🔍 Available sources:", sources.length);

      if (sources.length === 0) {
        throw new Error("Không tìm thấy nguồn màn hình");
      }

      // Show source selection modal
      this.showSourceModal(sources);
      this.mediaStatus.textContent = "📋 Chọn màn hình để chia sẻ";
    } catch (error: any) {
      console.error("Error getting screen sources:", error);
      this.mediaStatus.textContent =
        "❌ Không thể lấy danh sách màn hình: " + error.message;
    }
  }

  private showSourceModal(sources: any[]) {
    // Clear previous sources
    this.sourceList.innerHTML = "";

    // Add each source as a selectable option
    sources.forEach((source) => {
      const sourceItem = document.createElement("div");
      sourceItem.className =
        "border rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors";

      const isScreen = source.id.startsWith("screen:");
      const icon = isScreen ? "🖥️" : "🪟";

      sourceItem.innerHTML = `
        <div class="flex items-center space-x-3">
          <div class="text-2xl">${icon}</div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm truncate">${source.name}</div>
            <div class="text-xs text-gray-500">${
              isScreen ? "Màn hình" : "Cửa sổ"
            }</div>
          </div>
        </div>
      `;

      sourceItem.addEventListener("click", () => {
        this.selectSource(source);
      });

      this.sourceList.appendChild(sourceItem);
    });

    // Show modal
    this.sourceModal.classList.remove("hidden");
  }

  private hideSourceModal() {
    this.sourceModal.classList.add("hidden");
    this.mediaStatus.textContent = "";
  }

  private async selectSource(source: any) {
    try {
      this.hideSourceModal();
      this.mediaStatus.textContent = `🔄 Đang kết nối với ${source.name}...`;

      console.log("🔍 Selected source:", source.name, source.id);

      // Use getUserMedia with the selected desktop source
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: source.id,
            minWidth: 640,
            maxWidth: 1280,
            minHeight: 480,
            maxHeight: 720,
          },
        } as any,
      });

      console.log("✅ Screen share started successfully");
      this.setupVideoFrameCapture();
      this.updateMediaButtons(true);
      this.mediaStatus.textContent = `📹 Đang chia sẻ: ${source.name} - Hãy hỏi về nội dung!`;
    } catch (error: any) {
      console.error("Error starting screen share:", error);
      this.mediaStatus.textContent =
        "❌ Không thể chia sẻ màn hình: " + error.message;
    }
  }

  private setupVideoFrameCapture() {
    console.log("📹 Setting up image frame capture");

    // Tạo video element để hiển thị stream
    this.videoElement = document.createElement("video");
    this.videoElement.srcObject = this.mediaStream;
    this.videoElement.muted = true; // Ensure muted
    this.videoElement.autoplay = true;

    // Add event listeners for debugging
    this.videoElement.onloadstart = () => console.log("📹 Video load started");
    this.videoElement.oncanplay = () => console.log("📹 Video can play");
    this.videoElement.onplay = () => console.log("📹 Video playing");
    this.videoElement.onerror = (e) => console.error("📹 Video error:", e);

    this.videoElement.play();

    // Tạo canvas để capture frames
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");

    this.videoElement.onloadedmetadata = () => {
      // Tối ưu hóa resolution để giảm kích thước file
      const maxWidth = 1280;
      const maxHeight = 720;

      let { videoWidth, videoHeight } = this.videoElement!;

      // Scale down nếu quá lớn
      if (videoWidth > maxWidth || videoHeight > maxHeight) {
        const ratio = Math.min(maxWidth / videoWidth, maxHeight / videoHeight);
        videoWidth = Math.floor(videoWidth * ratio);
        videoHeight = Math.floor(videoHeight * ratio);
      }

      this.canvas!.width = videoWidth;
      this.canvas!.height = videoHeight;

      console.log(
        "📹 Optimized dimensions:",
        this.canvas!.width,
        "x",
        this.canvas!.height
      );

      // Capture frame đầu tiên
      this.captureCurrentFrame();

      // Capture frame mỗi 2 giây để giảm tải (thay vì 1 giây)
      this.frameInterval = setInterval(() => {
        try {
          this.captureCurrentFrame();
        } catch (error) {
          console.warn("⚠️ Frame capture error:", error);
        }
      }, 2000);

      this.isRecording = true;
      this.mediaStatus.textContent =
        "📹 Đang capture frames - Sẵn sàng cho câu hỏi";
    };
  }

  private captureCurrentFrame() {
    if (!this.videoElement || !this.canvas || !this.isRecording) return;

    try {
      // Draw current video frame to canvas
      this.ctx!.drawImage(
        this.videoElement,
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );

      // Convert to JPEG blob với compression tối ưu
      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            // Thêm frame vào sequence
            this.frameSequence.push({
              blob: blob,
              timestamp: Date.now(),
              size: blob.size,
            });

            // Giới hạn số frames (FIFO - First In First Out)
            if (this.frameSequence.length > this.maxFrames) {
              this.frameSequence.shift(); // Xóa frame cũ nhất
            }

            const sizeKB = Math.round(blob.size / 1024);
            const totalFrames = this.frameSequence.length;
            console.log(
              `📸 Frame ${totalFrames} captured:`,
              blob.size,
              "bytes",
              `(${sizeKB}KB)`
            );

            // Cảnh báo nếu file quá lớn
            if (sizeKB > 500) {
              console.warn("⚠️ Frame size lớn:", sizeKB, "KB");
            }

            this.mediaStatus.textContent = `📸 ${totalFrames} frames sẵn sàng - Hãy hỏi!`;
          } else {
            console.error("❌ Failed to capture frame");
          }
        },
        "image/jpeg",
        0.7 // Giảm quality để file nhỏ hơn
      );
    } catch (error) {
      console.error("Error capturing frame:", error);
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
