import { GoogleGenAI, Modality } from "@google/genai";
import * as fs from "node:fs";
import pkg from "wavefile";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const { WaveFile } = pkg;

// Kiểm tra API key
if (
  !process.env.GEMINI_API_KEY ||
  process.env.GEMINI_API_KEY === "your_api_key_here"
) {
  console.error("❌ Vui lòng cập nhật GEMINI_API_KEY trong file .env");
  console.log(
    "📝 Bạn có thể lấy API key tại: https://aistudio.google.com/app/apikey"
  );
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const model =
  process.env.GEMINI_MODEL || "gemini-2.5-flash-preview-native-audio-dialog";

class GeminiLiveStreaming {
  constructor() {
    this.session = null;
    this.responseQueue = [];
    this.isConnected = false;
    this.audioChunks = [];
  }

  async connect() {
    console.log("🔗 Đang kết nối với Gemini Live API...");

    const config = {
      responseModalities: [Modality.TEXT, Modality.AUDIO],
      systemInstruction:
        "Bạn là một trợ lý AI thông minh. Hãy trả lời ngắn gọn và thân thiện bằng tiếng Việt. Khi người dùng nói tiếng Anh, bạn có thể trả lời bằng tiếng Anh.",
    };

    try {
      this.session = await ai.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            console.log("✅ Kết nối thành công với Gemini Live!");
            this.isConnected = true;
          },
          onmessage: (message) => {
            this.responseQueue.push(message);
            if (message.data) {
              console.log("🎵 Nhận được phản hồi âm thanh từ Gemini");
              this.handleAudioResponse(message);
            }
            if (message.serverContent?.modelTurn?.parts) {
              const textParts = message.serverContent.modelTurn.parts
                .filter((part) => part.text)
                .map((part) => part.text);
              if (textParts.length > 0) {
                console.log("💬 Gemini:", textParts.join(" "));
              }
            }
          },
          onerror: (e) => {
            console.error("❌ Lỗi kết nối:", e.message);
            this.isConnected = false;
          },
          onclose: (e) => {
            console.log("🔌 Đóng kết nối:", e.reason);
            this.isConnected = false;
          },
        },
        config: config,
      });

      return true;
    } catch (error) {
      console.error("❌ Không thể kết nối:", error.message);
      return false;
    }
  }

  async sendAudioChunk(audioData) {
    if (!this.isConnected || !this.session) {
      console.log("⚠️ Chưa kết nối với Gemini Live");
      return;
    }

    try {
      // Chuyển đổi audio data thành base64
      const base64Audio = Buffer.from(audioData).toString("base64");

      this.session.sendRealtimeInput({
        audio: {
          data: base64Audio,
          mimeType: "audio/pcm;rate=16000",
        },
      });

      console.log("📤 Đã gửi chunk âm thanh");
    } catch (error) {
      console.error("❌ Lỗi khi gửi âm thanh:", error.message);
    }
  }

  async sendTextMessage(text) {
    if (!this.isConnected || !this.session) {
      console.log("⚠️ Chưa kết nối với Gemini Live");
      return;
    }

    try {
      this.session.sendRealtimeInput({
        text: text,
      });
      console.log("📤 Đã gửi tin nhắn:", text);
    } catch (error) {
      console.error("❌ Lỗi khi gửi tin nhắn:", error.message);
    }
  }

  handleAudioResponse(message) {
    if (message.data) {
      this.audioChunks.push(message.data);
    }
  }

  async saveAudioResponse(filename = "streaming_response.wav") {
    if (this.audioChunks.length === 0) {
      console.log("⚠️ Không có dữ liệu âm thanh để lưu");
      return;
    }

    try {
      // Kết hợp tất cả audio chunks
      const combinedAudio = this.audioChunks.reduce((acc, chunk) => {
        const buffer = Buffer.from(chunk, "base64");
        const intArray = new Int16Array(
          buffer.buffer,
          buffer.byteOffset,
          buffer.byteLength / Int16Array.BYTES_PER_ELEMENT
        );
        return acc.concat(Array.from(intArray));
      }, []);

      const audioBuffer = new Int16Array(combinedAudio);
      const wf = new WaveFile();
      wf.fromScratch(1, 24000, "16", audioBuffer); // output is 24kHz
      fs.writeFileSync(filename, wf.toBuffer());

      console.log(`✅ Đã lưu phản hồi âm thanh vào ${filename}`);

      // Reset audio chunks
      this.audioChunks = [];
    } catch (error) {
      console.error("❌ Lỗi khi lưu âm thanh:", error.message);
    }
  }

  disconnect() {
    if (this.session) {
      this.session.close();
      this.session = null;
      this.isConnected = false;
      console.log("🔌 Đã ngắt kết nối");
    }
  }
}

// Demo streaming với text input
async function demoTextStreaming() {
  console.log("🎯 Demo Gemini Live Streaming với Text Input");
  console.log("=====================================");

  const streaming = new GeminiLiveStreaming();

  // Kết nối
  const connected = await streaming.connect();
  if (!connected) {
    return;
  }

  // Chờ một chút để kết nối ổn định
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Gửi một số tin nhắn test
  const messages = [
    "Xin chào! Bạn có khỏe không?",
    "Hôm nay thời tiết thế nào?",
    "Bạn có thể giúp tôi học tiếng Anh không?",
  ];

  for (let i = 0; i < messages.length; i++) {
    console.log(`\n📝 Gửi tin nhắn ${i + 1}: ${messages[i]}`);
    await streaming.sendTextMessage(messages[i]);

    // Chờ phản hồi
    console.log("⏳ Đang chờ phản hồi...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Lưu phản hồi âm thanh
    await streaming.saveAudioResponse(`response_${i + 1}.wav`);
  }

  // Ngắt kết nối
  streaming.disconnect();
  console.log("\n🎉 Demo hoàn thành!");
}

// Demo streaming với audio chunks (mô phỏng microphone input)
async function demoAudioStreaming() {
  console.log("🎯 Demo Gemini Live Streaming với Audio Input");
  console.log("==========================================");

  const streaming = new GeminiLiveStreaming();

  // Kết nối
  const connected = await streaming.connect();
  if (!connected) {
    return;
  }

  // Chờ một chút để kết nối ổn định
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Tạo audio chunks mô phỏng (sine waves với tần số khác nhau)
  console.log("🎵 Tạo và gửi audio chunks mô phỏng...");

  const sampleRate = 16000;
  const chunkDuration = 0.5; // 0.5 giây mỗi chunk
  const samplesPerChunk = sampleRate * chunkDuration;

  const frequencies = [440, 523, 659]; // A4, C5, E5

  for (let i = 0; i < frequencies.length; i++) {
    const frequency = frequencies[i];
    console.log(`📤 Gửi audio chunk ${i + 1} (${frequency}Hz)...`);

    // Tạo sine wave
    const audioData = new Int16Array(samplesPerChunk);
    for (let j = 0; j < samplesPerChunk; j++) {
      audioData[j] =
        Math.sin((2 * Math.PI * frequency * j) / sampleRate) * 32767 * 0.3;
    }

    await streaming.sendAudioChunk(audioData);

    // Chờ một chút giữa các chunks
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Chờ phản hồi cuối cùng
  console.log("⏳ Đang chờ phản hồi cuối cùng...");
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Lưu phản hồi âm thanh
  await streaming.saveAudioResponse("audio_streaming_response.wav");

  // Ngắt kết nối
  streaming.disconnect();
  console.log("\n🎉 Demo hoàn thành!");
}

// Main function
async function main() {
  console.log("🚀 Gemini Live Streaming Demo");
  console.log("============================");

  const args = process.argv.slice(2);
  const mode = args[0] || "text";

  if (mode === "audio") {
    await demoAudioStreaming();
  } else {
    await demoTextStreaming();
  }
}

// Export class để có thể sử dụng trong các file khác
export { GeminiLiveStreaming };

// Chạy demo nếu file được chạy trực tiếp
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
