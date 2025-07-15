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

const config = {
  responseModalities: [Modality.TEXT, Modality.AUDIO],
  systemInstruction:
    "Bạn là một trợ lý hữu ích và trả lời bằng giọng điệu thân thiện. Hãy trả lời bằng tiếng Việt.",
};

async function testBasicAudio() {
  console.log("🎵 Bắt đầu test Gemini Live API với file âm thanh...");

  const responseQueue = [];

  async function waitMessage() {
    let done = false;
    let message = undefined;
    while (!done) {
      message = responseQueue.shift();
      if (message) {
        done = true;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    return message;
  }

  async function handleTurn() {
    const turns = [];
    let done = false;
    while (!done) {
      const message = await waitMessage();
      turns.push(message);
      if (message.serverContent && message.serverContent.turnComplete) {
        done = true;
      }
    }
    return turns;
  }

  try {
    console.log("🔗 Đang kết nối với Gemini Live API...");

    const session = await ai.live.connect({
      model: model,
      callbacks: {
        onopen: function () {
          console.log("✅ Kết nối thành công!");
        },
        onmessage: function (message) {
          responseQueue.push(message);
          if (message.data) {
            console.log("📨 Nhận được dữ liệu âm thanh từ Gemini");
          }
          if (message.serverContent?.modelTurn?.parts) {
            const textParts = message.serverContent.modelTurn.parts
              .filter((part) => part.text)
              .map((part) => part.text);
            if (textParts.length > 0) {
              console.log("💬 Gemini (text):", textParts.join(" "));
            }
          }
        },
        onerror: function (e) {
          console.error("❌ Lỗi:", e.message);
        },
        onclose: function (e) {
          console.log("🔌 Đóng kết nối:", e.reason);
        },
      },
      config: config,
    });

    // Kiểm tra xem có file âm thanh mẫu không
    const sampleFile = "sample.wav";
    if (!fs.existsSync(sampleFile)) {
      console.log(
        "📁 Không tìm thấy file sample.wav, tạo file âm thanh test..."
      );
      await createTestAudio();
    }

    // Đọc file âm thanh
    console.log("📖 Đang đọc file âm thanh...");
    const fileBuffer = fs.readFileSync(sampleFile);

    // Chuyển đổi âm thanh về định dạng yêu cầu (16-bit PCM, 16kHz, mono)
    console.log("🔄 Đang chuyển đổi định dạng âm thanh...");
    const wav = new WaveFile();
    wav.fromBuffer(fileBuffer);
    wav.toSampleRate(16000);
    wav.toBitDepth("16");
    wav.toMono();
    const base64Audio = wav.toBase64();

    console.log("📤 Đang gửi âm thanh đến Gemini...");

    // Gửi âm thanh
    session.sendRealtimeInput({
      audio: {
        data: base64Audio,
        mimeType: "audio/pcm;rate=16000",
      },
    });

    console.log("⏳ Đang chờ phản hồi từ Gemini...");
    const turns = await handleTurn();

    // Kết hợp dữ liệu âm thanh và lưu thành file WAV
    console.log("🎵 Đang xử lý phản hồi âm thanh...");
    const combinedAudio = turns.reduce((acc, turn) => {
      if (turn.data) {
        const buffer = Buffer.from(turn.data, "base64");
        const intArray = new Int16Array(
          buffer.buffer,
          buffer.byteOffset,
          buffer.byteLength / Int16Array.BYTES_PER_ELEMENT
        );
        return acc.concat(Array.from(intArray));
      }
      return acc;
    }, []);

    if (combinedAudio.length > 0) {
      const audioBuffer = new Int16Array(combinedAudio);
      const wf = new WaveFile();
      wf.fromScratch(1, 24000, "16", audioBuffer); // output is 24kHz
      fs.writeFileSync("response.wav", wf.toBuffer());
      console.log("✅ Đã lưu phản hồi âm thanh vào file response.wav");
    } else {
      console.log("⚠️ Không nhận được dữ liệu âm thanh từ Gemini");
    }

    session.close();
    console.log("🎉 Hoàn thành test thành công!");
  } catch (error) {
    console.error("❌ Lỗi khi test:", error.message);
    if (error.message.includes("API key")) {
      console.log("💡 Hãy kiểm tra lại API key trong file .env");
    }
  }
}

// Tạo file âm thanh test đơn giản
async function createTestAudio() {
  console.log("🎤 Tạo file âm thanh test...");

  // Tạo âm thanh sine wave đơn giản (1 giây, 440Hz)
  const sampleRate = 16000;
  const duration = 1; // 1 giây
  const frequency = 440; // A4 note
  const samples = sampleRate * duration;

  const audioData = new Int16Array(samples);
  for (let i = 0; i < samples; i++) {
    audioData[i] =
      Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 32767 * 0.5;
  }

  const wf = new WaveFile();
  wf.fromScratch(1, sampleRate, "16", audioData);
  fs.writeFileSync("sample.wav", wf.toBuffer());

  console.log("✅ Đã tạo file sample.wav");
}

// Chạy test
if (import.meta.url === `file://${process.argv[1]}`) {
  testBasicAudio().catch(console.error);
}
