import express from "express";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cors from "cors";
import { GoogleGenAI, Modality } from "@google/genai";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Kiểm tra API key
if (
  !process.env.GEMINI_API_KEY ||
  process.env.GEMINI_API_KEY === "your_api_key_here"
) {
  console.error("❌ Vui lòng cập nhật GEMINI_API_KEY trong file .env");
  console.log(
    "📝 Bạn có thể lấy API key tại: https://aistudio.google.com/app/apikey"
  );
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// WebSocket connection handler
wss.on("connection", (ws) => {
  console.log("🔗 Client kết nối WebSocket");

  let geminiSession = null;
  let responseQueue = [];

  // Helper functions
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

  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case "connect":
          await handleConnect(message);
          break;
        case "sendAudio":
          await handleSendAudio(message);
          break;
        case "sendText":
          await handleSendText(message);
          break;
        case "disconnect":
          await handleDisconnect();
          break;
        default:
          console.log("❓ Unknown message type:", message.type);
      }
    } catch (error) {
      console.error("❌ Error processing message:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: error.message,
        })
      );
    }
  });

  async function handleConnect(message) {
    try {
      console.log("🔗 Connecting to Gemini Live...");

      const config = {
        responseModalities: [Modality.TEXT, Modality.AUDIO],
        systemInstruction:
          message.systemInstruction ||
          "Bạn là một trợ lý AI thông minh. Hãy trả lời ngắn gọn và thân thiện bằng tiếng Việt.",
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      };

      geminiSession = await ai.live.connect({
        model:
          process.env.GEMINI_MODEL ||
          "gemini-2.5-flash-preview-native-audio-dialog",
        callbacks: {
          onopen: () => {
            console.log("✅ Connected to Gemini Live");
            ws.send(
              JSON.stringify({
                type: "connected",
                message: "Đã kết nối với Gemini Live",
              })
            );
          },
          onmessage: (msg) => {
            responseQueue.push(msg);
            if (msg.data) {
              ws.send(
                JSON.stringify({
                  type: "audioResponse",
                  data: msg.data,
                })
              );
            }
            if (msg.serverContent?.modelTurn?.parts) {
              const textParts = msg.serverContent.modelTurn.parts
                .filter((part) => part.text)
                .map((part) => part.text);
              if (textParts.length > 0) {
                ws.send(
                  JSON.stringify({
                    type: "textResponse",
                    text: textParts.join(" "),
                  })
                );
              }
            }

            // Handle transcriptions
            if (msg.serverContent?.inputTranscription) {
              ws.send(
                JSON.stringify({
                  type: "inputTranscription",
                  text: msg.serverContent.inputTranscription.text,
                })
              );
            }

            if (msg.serverContent?.outputTranscription) {
              ws.send(
                JSON.stringify({
                  type: "outputTranscription",
                  text: msg.serverContent.outputTranscription.text,
                })
              );
            }
          },
          onerror: (e) => {
            console.error("❌ Gemini error:", e.message);
            ws.send(
              JSON.stringify({
                type: "error",
                message: e.message,
              })
            );
          },
          onclose: (e) => {
            console.log("🔌 Gemini connection closed:", e.reason);
            ws.send(
              JSON.stringify({
                type: "disconnected",
                message: "Đã ngắt kết nối với Gemini Live",
              })
            );
          },
        },
        config: config,
      });
    } catch (error) {
      console.error("❌ Failed to connect to Gemini:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Không thể kết nối với Gemini Live: " + error.message,
        })
      );
    }
  }

  async function handleSendAudio(message) {
    if (!geminiSession) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Chưa kết nối với Gemini Live",
        })
      );
      return;
    }

    try {
      geminiSession.sendRealtimeInput({
        audio: {
          data: message.audioData,
          mimeType: "audio/pcm;rate=16000",
        },
      });
    } catch (error) {
      console.error("❌ Error sending audio:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Lỗi khi gửi âm thanh: " + error.message,
        })
      );
    }
  }

  async function handleSendText(message) {
    if (!geminiSession) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Chưa kết nối với Gemini Live",
        })
      );
      return;
    }

    try {
      geminiSession.sendRealtimeInput({
        text: message.text,
      });
    } catch (error) {
      console.error("❌ Error sending text:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Lỗi khi gửi tin nhắn: " + error.message,
        })
      );
    }
  }

  async function handleDisconnect() {
    if (geminiSession) {
      geminiSession.close();
      geminiSession = null;
    }
  }

  ws.on("close", () => {
    console.log("🔌 Client ngắt kết nối WebSocket");
    if (geminiSession) {
      geminiSession.close();
    }
  });
});

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/status", (req, res) => {
  res.json({
    status: "running",
    model:
      process.env.GEMINI_MODEL ||
      "gemini-2.5-flash-preview-native-audio-dialog",
    hasApiKey: !!(
      process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY !== "your_api_key_here"
    ),
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  console.log(
    `📱 Mở trình duyệt và truy cập http://localhost:${PORT} để test Gemini Live`
  );

  if (
    !process.env.GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY === "your_api_key_here"
  ) {
    console.log("⚠️  Nhớ cập nhật API key trong file .env trước khi test!");
  }
});
