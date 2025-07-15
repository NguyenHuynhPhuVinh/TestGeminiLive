class GeminiLiveClient {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.isGeminiConnected = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.audioResponseChunks = [];
    this.audioResponseTimeout = null;
    this.currentAudioMessage = null;

    this.initializeElements();
    this.setupEventListeners();
    this.loadStatus();
  }

  initializeElements() {
    this.wsStatusEl = document.getElementById("wsStatus");
    this.geminiStatusEl = document.getElementById("geminiStatus");
    this.modelNameEl = document.getElementById("modelName");
    this.connectBtn = document.getElementById("connectBtn");
    this.disconnectBtn = document.getElementById("disconnectBtn");
    this.sendTextBtn = document.getElementById("sendTextBtn");
    this.recordBtn = document.getElementById("recordBtn");
    this.textInput = document.getElementById("textInput");
    this.systemInstruction = document.getElementById("systemInstruction");
    this.messagesEl = document.getElementById("messages");
  }

  setupEventListeners() {
    this.connectBtn.addEventListener("click", () => this.connectToGemini());
    this.disconnectBtn.addEventListener("click", () =>
      this.disconnectFromGemini()
    );
    this.sendTextBtn.addEventListener("click", () => this.sendTextMessage());
    this.recordBtn.addEventListener("click", () => this.toggleRecording());

    this.textInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.sendTextMessage();
      }
    });
  }

  async loadStatus() {
    try {
      const response = await fetch("/api/status");
      const status = await response.json();

      this.modelNameEl.textContent = status.model;

      if (!status.hasApiKey) {
        this.addMessage(
          "error",
          "Chưa cấu hình API key. Vui lòng cập nhật file .env"
        );
      }

      this.connectWebSocket();
    } catch (error) {
      this.addMessage(
        "error",
        "Không thể tải trạng thái server: " + error.message
      );
    }
  }

  connectWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.isConnected = true;
      this.updateStatus();
      this.addMessage("ai", "Đã kết nối WebSocket thành công!");
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleWebSocketMessage(message);
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      this.isGeminiConnected = false;
      this.updateStatus();
      this.addMessage("error", "Mất kết nối WebSocket");
    };

    this.ws.onerror = (error) => {
      this.addMessage("error", "Lỗi WebSocket: " + error.message);
    };
  }

  handleWebSocketMessage(message) {
    switch (message.type) {
      case "connected":
        this.isGeminiConnected = true;
        this.updateStatus();
        this.addMessage("ai", message.message);
        break;

      case "disconnected":
        this.isGeminiConnected = false;
        this.updateStatus();
        this.addMessage("ai", message.message);
        break;

      case "textResponse":
        this.addMessage("ai", message.text);
        break;

      case "audioResponse":
        this.handleAudioResponse(message.data);
        break;

      case "inputTranscription":
        this.addMessage("user", `🎤 Bạn nói: "${message.text}"`);
        break;

      case "outputTranscription":
        this.addMessage("ai", `📝 Gemini transcript: "${message.text}"`);
        break;

      case "error":
        this.addMessage("error", message.message);
        break;

      default:
        console.log("Unknown message type:", message.type);
    }
  }

  handleAudioResponse(audioData) {
    // Tích lũy audio chunks
    this.audioResponseChunks.push(audioData);

    // Clear timeout cũ nếu có
    if (this.audioResponseTimeout) {
      clearTimeout(this.audioResponseTimeout);
    }

    // Nếu chưa có message hiện tại, tạo mới
    if (!this.currentAudioMessage) {
      this.currentAudioMessage = document.createElement("div");
      this.currentAudioMessage.className = "message message-ai";
      this.currentAudioMessage.innerHTML = `
        <div class="message-time">${new Date().toLocaleTimeString()}</div>
        <div>🎵 Đang nhận phản hồi âm thanh từ Gemini... <span class="chunks-count">(${
          this.audioResponseChunks.length
        } chunks)</span></div>
      `;
      this.messagesEl.appendChild(this.currentAudioMessage);
      this.scrollToBottom();
    } else {
      // Cập nhật số lượng chunks
      const chunksSpan =
        this.currentAudioMessage.querySelector(".chunks-count");
      if (chunksSpan) {
        chunksSpan.textContent = `(${this.audioResponseChunks.length} chunks)`;
      }
    }

    // Đặt timeout để xử lý audio sau khi không còn chunks mới
    this.audioResponseTimeout = setTimeout(() => {
      this.processAudioResponse();
    }, 500); // Chờ 500ms sau chunk cuối cùng
  }

  processAudioResponse() {
    if (this.audioResponseChunks.length === 0) return;

    try {
      // Kết hợp tất cả audio chunks
      const combinedAudioData = this.audioResponseChunks.join("");
      const audioBlob = this.base64ToBlob(combinedAudioData, "audio/wav");
      const audioUrl = URL.createObjectURL(audioBlob);

      const audioElement = document.createElement("audio");
      audioElement.controls = true;
      audioElement.src = audioUrl;
      audioElement.className = "audio-player";

      // Cập nhật message hiện tại
      if (this.currentAudioMessage) {
        this.currentAudioMessage.innerHTML = `
          <div class="message-time">${new Date().toLocaleTimeString()}</div>
          <div>🎵 Phản hồi âm thanh từ Gemini (${
            this.audioResponseChunks.length
          } chunks):</div>
        `;
        this.currentAudioMessage.appendChild(audioElement);
      }

      // Tự động phát âm thanh
      audioElement.play().catch((e) => {
        console.log("Không thể tự động phát âm thanh:", e.message);
      });
    } catch (error) {
      console.error("Lỗi khi xử lý audio response:", error);
      if (this.currentAudioMessage) {
        this.currentAudioMessage.innerHTML = `
          <div class="message-time">${new Date().toLocaleTimeString()}</div>
          <div>❌ Lỗi khi xử lý âm thanh: ${error.message}</div>
        `;
      }
    }

    // Reset
    this.audioResponseChunks = [];
    this.currentAudioMessage = null;
    this.audioResponseTimeout = null;
  }

  base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  connectToGemini() {
    if (!this.isConnected) {
      this.addMessage("error", "Chưa kết nối WebSocket");
      return;
    }

    const systemInstruction = this.systemInstruction.value.trim();

    this.ws.send(
      JSON.stringify({
        type: "connect",
        systemInstruction: systemInstruction,
      })
    );

    this.addMessage("user", "Đang kết nối với Gemini Live...");
  }

  disconnectFromGemini() {
    if (this.ws && this.isGeminiConnected) {
      this.ws.send(
        JSON.stringify({
          type: "disconnect",
        })
      );
    }
  }

  sendTextMessage() {
    const text = this.textInput.value.trim();
    if (!text) return;

    if (!this.isGeminiConnected) {
      this.addMessage("error", "Chưa kết nối với Gemini Live");
      return;
    }

    this.ws.send(
      JSON.stringify({
        type: "sendText",
        text: text,
      })
    );

    this.addMessage("user", text);
    this.textInput.value = "";
  }

  async toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        this.processRecording();
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      this.updateRecordingUI();

      this.addMessage("user", "🎤 Bắt đầu ghi âm...");
    } catch (error) {
      this.addMessage(
        "error",
        "Không thể truy cập microphone: " + error.message
      );
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      this.isRecording = false;
      this.updateRecordingUI();

      this.addMessage("user", "⏹️ Dừng ghi âm");
    }
  }

  async processRecording() {
    if (this.audioChunks.length === 0) return;

    const audioBlob = new Blob(this.audioChunks, { type: "audio/wav" });
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );

    if (this.isGeminiConnected) {
      this.ws.send(
        JSON.stringify({
          type: "sendAudio",
          audioData: base64Audio,
        })
      );

      this.addMessage("user", "📤 Đã gửi âm thanh đến Gemini");
    } else {
      this.addMessage("error", "Chưa kết nối với Gemini Live");
    }
  }

  updateRecordingUI() {
    if (this.isRecording) {
      this.recordBtn.textContent = "⏹️ Dừng ghi âm";
      this.recordBtn.classList.add("recording");
    } else {
      this.recordBtn.textContent = "🎤 Bắt đầu ghi âm";
      this.recordBtn.classList.remove("recording");
    }
  }

  updateStatus() {
    // Update WebSocket status
    if (this.isConnected) {
      this.wsStatusEl.textContent = "Đã kết nối";
      this.wsStatusEl.className = "status-badge status-connected";
    } else {
      this.wsStatusEl.textContent = "Chưa kết nối";
      this.wsStatusEl.className = "status-badge status-disconnected";
    }

    // Update Gemini status
    if (this.isGeminiConnected) {
      this.geminiStatusEl.textContent = "Đã kết nối";
      this.geminiStatusEl.className = "status-badge status-connected";
    } else {
      this.geminiStatusEl.textContent = "Chưa kết nối";
      this.geminiStatusEl.className = "status-badge status-disconnected";
    }

    // Update button states
    this.connectBtn.disabled = !this.isConnected || this.isGeminiConnected;
    this.disconnectBtn.disabled = !this.isGeminiConnected;
    this.sendTextBtn.disabled = !this.isGeminiConnected;
    this.recordBtn.disabled = !this.isGeminiConnected;
  }

  addMessage(type, content) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message message-${type}`;

    const timeDiv = document.createElement("div");
    timeDiv.className = "message-time";
    timeDiv.textContent = new Date().toLocaleTimeString();

    const contentDiv = document.createElement("div");
    contentDiv.textContent = content;

    messageDiv.appendChild(timeDiv);
    messageDiv.appendChild(contentDiv);

    this.messagesEl.appendChild(messageDiv);
    this.scrollToBottom();
  }

  scrollToBottom() {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }
}

// Initialize the client when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new GeminiLiveClient();
});
