class TextChatClient {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.isWaitingResponse = false;
    this.currentAiMessage = null;
    this.currentAiContent = "";
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.isRecording = false;
    this.videoChunks = [];
    this.audioChunks = [];
    this.frameSequence = []; // Array để lưu tất cả frames
    this.maxFrames = 30; // Tối đa 30 frames (30 giây)
    this.initializeElements();
    this.setupEventListeners();
  }

  initializeElements() {
    this.statusEl = document.getElementById("status");
    this.connectBtn = document.getElementById("connectBtn");
    this.textInput = document.getElementById("textInput");
    this.sendBtn = document.getElementById("sendBtn");
    this.messagesEl = document.getElementById("messages");
    this.typingIndicator = document.getElementById("typingIndicator");
    this.screenBtn = document.getElementById("screenBtn");
    this.stopBtn = document.getElementById("stopBtn");
    this.mediaStatus = document.getElementById("mediaStatus");
  }

  setupEventListeners() {
    this.connectBtn.addEventListener("click", () => this.toggleConnection());
    this.sendBtn.addEventListener("click", () => this.sendMessage());
    this.screenBtn.addEventListener("click", () => this.startScreenShare());

    this.stopBtn.addEventListener("click", () => this.stopCapture());
    this.textInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  }

  async toggleConnection() {
    if (this.isConnected) {
      this.disconnect();
    } else {
      await this.connect();
    }
  }

  async connect() {
    try {
      this.updateStatus("🟡 Đang kết nối...", false);
      this.connectBtn.disabled = true;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.ws.send(
          JSON.stringify({
            type: "connect",
            systemInstruction:
              "Bạn là một trợ lý AI thông minh. Hãy trả lời ngắn gọn và thân thiện bằng tiếng Việt.",
          })
        );
      };

      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this.handleWebSocketMessage(message);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.updateStatus("🔴 Mất kết nối", false);
        this.connectBtn.textContent = "Kết nối";
        this.connectBtn.disabled = false;
        this.textInput.disabled = true;
        this.sendBtn.disabled = true;
        this.hideTypingIndicator();
      };

      this.ws.onerror = () => {
        this.updateStatus("🔴 Lỗi kết nối", false);
        this.connectBtn.disabled = false;
        this.addMessage("error", "Lỗi WebSocket");
      };
    } catch (error) {
      this.updateStatus("🔴 Lỗi kết nối", false);
      this.connectBtn.disabled = false;
      this.addMessage("error", "Không thể kết nối: " + error.message);
    }
  }

  handleWebSocketMessage(message) {
    switch (message.type) {
      case "connected":
        this.isConnected = true;
        this.updateStatus("🟢 Đã kết nối", true);
        this.connectBtn.textContent = "Ngắt kết nối";
        this.connectBtn.disabled = false;
        this.textInput.disabled = false;
        this.sendBtn.disabled = false;
        this.screenBtn.disabled = false;
        this.addMessage("ai", message.message);
        break;
      case "textChunk":
        this.hideTypingIndicator();
        this.appendToAiMessage(message.text);
        break;

      case "turnComplete":
        this.finishAiMessage();
        this.isWaitingResponse = false;
        this.sendBtn.disabled = false;
        break;
      case "videoReceived":
        this.addMessage("ai", "✅ " + message.message);
        break;

      case "processing":
        this.showTypingIndicator();
        break;

      case "error":
        this.hideTypingIndicator();
        this.addMessage("error", message.message);
        this.isWaitingResponse = false;
        this.sendBtn.disabled = false;
        break;
    }
  }

  appendToAiMessage(text) {
    if (!this.currentAiMessage) {
      // Tạo message mới cho AI
      this.currentAiMessage = document.createElement("div");
      this.currentAiMessage.className = "message message-ai";

      const timeDiv = document.createElement("div");
      timeDiv.className = "message-time";
      timeDiv.textContent = new Date().toLocaleTimeString();

      const contentDiv = document.createElement("div");
      contentDiv.className = "message-content";

      this.currentAiMessage.appendChild(timeDiv);
      this.currentAiMessage.appendChild(contentDiv);
      this.messagesEl.appendChild(this.currentAiMessage);

      this.currentAiContent = "";
    }

    // Append text vào content hiện tại
    this.currentAiContent += text;
    const contentDiv = this.currentAiMessage.querySelector(".message-content");
    contentDiv.textContent = this.currentAiContent;

    this.scrollToBottom();
  }

  finishAiMessage() {
    this.currentAiMessage = null;
    this.currentAiContent = "";
  }

  disconnect() {
    if (this.ws) {
      this.ws.send(JSON.stringify({ type: "disconnect" }));
      this.ws.close();
      this.ws = null;
    }
    this.stopCapture(); // Stop any ongoing media capture
    this.isConnected = false;
    this.updateStatus("🔴 Chưa kết nối", false);
    this.connectBtn.textContent = "Kết nối";
    this.textInput.disabled = true;
    this.sendBtn.disabled = true;
    this.screenBtn.disabled = true;
    this.hideTypingIndicator();
  }

  updateStatus(text, connected) {
    this.statusEl.textContent = text;
    this.statusEl.className = connected
      ? "status-connected"
      : "status-disconnected";
  }

  async sendMessage() {
    const text = this.textInput.value.trim();
    if (!text || !this.isConnected || this.isWaitingResponse) return;

    this.addMessage("user", text);

    // Thông báo nếu đang gửi kèm video
    if (this.isRecording) {
      this.addMessage(
        "system",
        "📹 Đang gửi câu hỏi kèm video context đến Gemini..."
      );
    }

    this.textInput.value = "";
    this.isWaitingResponse = true;
    this.sendBtn.disabled = true;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Nếu có frame sequence, gửi tất cả frames
      if (this.frameSequence && this.frameSequence.length > 0) {
        this.sendTextWithFrameSequence(text, this.frameSequence);
        // Xóa tất cả frames cũ và bắt đầu sequence mới
        this.clearFrameSequence();
      } else {
        // Chỉ gửi text nếu không có frames
        this.ws.send(
          JSON.stringify({
            type: "sendText",
            text: text,
          })
        );
      }
    } else {
      this.addMessage("error", "Không có kết nối WebSocket");
      this.isWaitingResponse = false;
      this.sendBtn.disabled = false;
    }
  }

  showTypingIndicator() {
    this.typingIndicator.classList.add("show");
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    this.typingIndicator.classList.remove("show");
  }

  addMessage(type, content) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message message-${type}`;

    const timeDiv = document.createElement("div");
    timeDiv.className = "message-time";
    timeDiv.textContent = new Date().toLocaleTimeString();

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    contentDiv.textContent = content;

    messageDiv.appendChild(timeDiv);
    messageDiv.appendChild(contentDiv);

    this.messagesEl.appendChild(messageDiv);
    this.scrollToBottom();
  }

  scrollToBottom() {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  async startScreenShare() {
    try {
      this.mediaStatus.textContent =
        "🔄 Đang yêu cầu quyền chia sẻ màn hình...";

      this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: "screen" },
        audio: true, // Capture system audio
      });

      this.setupVideoFrameCapture();
      this.updateMediaButtons(true);
      this.mediaStatus.textContent =
        "📹 Đang thu video từ màn hình - Hãy hỏi về nội dung!";
    } catch (error) {
      console.error("Error starting screen share:", error);
      this.mediaStatus.textContent =
        "❌ Không thể chia sẻ màn hình: " + error.message;
    }
  }

  setupVideoFrameCapture() {
    // Thay đổi approach: Capture image frames thay vì video
    console.log("📹 Setting up image frame capture instead of video");

    // Tạo video element để hiển thị stream
    this.videoElement = document.createElement("video");
    this.videoElement.srcObject = this.mediaStream;
    this.videoElement.play();

    // Tạo canvas để capture frames
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");

    this.videoElement.onloadedmetadata = () => {
      // Tối ưu hóa resolution để giảm kích thước file
      const maxWidth = 1280;
      const maxHeight = 720;

      let { videoWidth, videoHeight } = this.videoElement;

      // Scale down nếu quá lớn
      if (videoWidth > maxWidth || videoHeight > maxHeight) {
        const ratio = Math.min(maxWidth / videoWidth, maxHeight / videoHeight);
        videoWidth = Math.floor(videoWidth * ratio);
        videoHeight = Math.floor(videoHeight * ratio);
      }

      this.canvas.width = videoWidth;
      this.canvas.height = videoHeight;

      console.log(
        "📹 Optimized dimensions:",
        this.canvas.width,
        "x",
        this.canvas.height
      );

      // Capture frame đầu tiên
      this.captureCurrentFrame();

      // Capture frame mỗi 1 giây để tạo sequence
      this.frameInterval = setInterval(() => {
        this.captureCurrentFrame();
      }, 1000);

      this.isRecording = true;
      this.mediaStatus.textContent =
        "📹 Đang capture frames - Sẵn sàng cho câu hỏi";
    };
  }

  captureCurrentFrame() {
    if (!this.videoElement || !this.canvas || !this.isRecording) return;

    try {
      // Draw current video frame to canvas
      this.ctx.drawImage(
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

  async sendTextWithFrameSequence(text, frameSequence) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

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
      this.ws.send(
        JSON.stringify({
          type: "sendTextWithFrameSequence",
          text: text,
          frames: frameDataArray,
          totalFrames: frameSequence.length,
          totalSize: totalSize,
        })
      );
    } catch (error) {
      console.error("Error sending text with frame sequence:", error);
      // Fallback: chỉ gửi text
      this.ws.send(
        JSON.stringify({
          type: "sendText",
          text: text,
        })
      );
    }
  }

  clearFrameSequence() {
    console.log(`🗑️ Clearing ${this.frameSequence.length} old frames`);
    this.frameSequence = [];
    this.mediaStatus.textContent =
      "📸 Đã xóa frames cũ - Đang thu thập frames mới...";
  }

  stopCapture() {
    this.isRecording = false;

    // Stop MediaRecorder nếu có
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    // Stop frame capture interval
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }

    // Clean up video elements
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    if (this.canvas) {
      this.canvas = null;
      this.ctx = null;
    }

    // Clean up data
    this.frameSequence = [];
    this.audioChunks = [];

    // Stop media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.updateMediaButtons(false);
    this.mediaStatus.textContent = "";
  }

  updateMediaButtons(isRecording) {
    this.screenBtn.disabled = isRecording || !this.isConnected;
    this.stopBtn.disabled = !isRecording;
    this.stopBtn.style.display = isRecording ? "inline-block" : "none";

    if (isRecording) {
      this.screenBtn.classList.add("active");
    } else {
      this.screenBtn.classList.remove("active");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new TextChatClient();
});
