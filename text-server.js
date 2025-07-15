import express from "express";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Modality } from "@google/genai";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.TEXT_PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

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

  // Helper functions cho Gemini Live
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

  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case "connect":
          await handleConnect(message);
          break;
        case "sendText":
          await handleSendText(message);
          break;
        case "sendTextWithVideo":
          await handleSendTextWithVideo(message);
          break;
        case "sendTextWithFrameSequence":
          await handleSendTextWithFrameSequence(message);
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
      console.log("🔗 Connecting to Gemini Live (Text Only)...");

      const config = {
        responseModalities: [Modality.TEXT], // CHỈ trả về text, KHÔNG có audio
        systemInstruction:
          message.systemInstruction ||
          "Bạn là một trợ lý AI thông minh có thể xem và phân tích hình ảnh từ màn hình người dùng. Khi nhận được hình ảnh, hãy mô tả chi tiết và chính xác những gì bạn thấy. Trả lời bằng tiếng Việt thân thiện, cụ thể và hữu ích.",
      };

      geminiSession = await ai.live.connect({
        model: "gemini-live-2.5-flash-preview",
        callbacks: {
          onopen: () => {
            console.log("✅ Connected to Gemini Live");
            ws.send(
              JSON.stringify({
                type: "connected",
                message: "Đã kết nối với Gemini Live (Text Only)",
              })
            );
          },
          onmessage: (msg) => {
            responseQueue.push(msg);

            // Debug log để xem structure của message
            console.log(
              "📨 Received message type:",
              typeof msg,
              Object.keys(msg)
            );

            // Ưu tiên xử lý msg.text trước
            if (msg.text) {
              console.log("📝 Sending text chunk:", msg.text);
              ws.send(
                JSON.stringify({
                  type: "textChunk",
                  text: msg.text,
                })
              );
            }
            // Chỉ xử lý modelTurn.parts nếu không có msg.text
            else if (msg.serverContent?.modelTurn?.parts) {
              const textParts = msg.serverContent.modelTurn.parts
                .filter((part) => part.text)
                .map((part) => part.text);
              if (textParts.length > 0) {
                console.log(
                  "📝 Sending model turn parts:",
                  textParts.join(" ")
                );
                ws.send(
                  JSON.stringify({
                    type: "textChunk",
                    text: textParts.join(" "),
                  })
                );
              }
            }

            // Báo hiệu turn complete
            if (msg.serverContent?.turnComplete) {
              console.log("✅ Turn complete");
              ws.send(
                JSON.stringify({
                  type: "turnComplete",
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
      console.log("📤 Sending text only to Gemini:", message.text);

      // Chỉ gửi text (không kèm video)
      geminiSession.sendClientContent({
        turns: message.text,
        turnComplete: true,
      });

      // Báo hiệu đang xử lý
      ws.send(
        JSON.stringify({
          type: "processing",
          message: "Đang xử lý tin nhắn...",
        })
      );
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

  async function handleSendTextWithVideo(message) {
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
      console.log("📤 Sending text with video to Gemini:", message.text);
      console.log("📊 Video data size:", message.videoData.length);
      console.log("📊 MIME type:", message.mimeType);

      // Kiểm tra kích thước video
      const videoSizeKB = Math.round((message.videoData.length * 0.75) / 1024); // Base64 to bytes
      console.log("📊 Video size:", videoSizeKB, "KB");

      if (videoSizeKB > 15000) {
        // > 15MB
        console.log("⚠️ Video quá lớn, bỏ qua video và chỉ gửi text");
        geminiSession.sendClientContent({
          turns: message.text,
          turnComplete: true,
        });
        return;
      }

      // Gửi image frame thay vì video (theo approach của Medium article)
      console.log(
        "🖼️ Sending image frame via sendClientContent with inlineData..."
      );

      // Detect if this is an image or video based on MIME type
      let mimeType = message.mimeType || "image/jpeg";
      if (mimeType.startsWith("video/")) {
        console.log("⚠️ Converting video MIME type to image/jpeg");
        mimeType = "image/jpeg";
      }

      const turns = [
        message.text,
        {
          inlineData: {
            data: message.videoData,
            mimeType: mimeType,
          },
        },
      ];

      geminiSession.sendClientContent({
        turns: turns,
        turnComplete: true,
      });

      // Báo hiệu đang xử lý
      ws.send(
        JSON.stringify({
          type: "processing",
          message: "Đang xử lý tin nhắn với video context...",
        })
      );
    } catch (error) {
      console.error("❌ Error sending text with video:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Lỗi khi gửi tin nhắn với video: " + error.message,
        })
      );
    }
  }

  async function handleSendTextWithFrameSequence(message) {
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
      console.log(
        `📤 Sending text with ${message.totalFrames} frames to Gemini:`,
        message.text
      );
      console.log(`📊 Total size: ${Math.round(message.totalSize / 1024)}KB`);

      // Kiểm tra kích thước tổng
      if (message.totalSize > 15 * 1024 * 1024) {
        // > 15MB
        console.log("⚠️ Frame sequence quá lớn, chỉ gửi text");
        geminiSession.sendClientContent({
          turns: message.text,
          turnComplete: true,
        });
        return;
      }

      // Tạo turns array với text + tất cả frames
      const turns = [message.text];

      // Thêm tất cả frames vào turns
      message.frames.forEach((frame, index) => {
        turns.push({
          inlineData: {
            data: frame.data,
            mimeType: frame.mimeType,
          },
        });
      });

      console.log(
        `🖼️ Sending ${message.totalFrames} frames via sendClientContent...`
      );

      geminiSession.sendClientContent({
        turns: turns,
        turnComplete: true,
      });

      // Báo hiệu đang xử lý
      ws.send(
        JSON.stringify({
          type: "processing",
          message: `Đang xử lý tin nhắn với ${message.totalFrames} frames...`,
        })
      );
    } catch (error) {
      console.error("❌ Error sending text with frame sequence:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Lỗi khi gửi tin nhắn với frames: " + error.message,
        })
      );
    }
  }

  async function handleDisconnect() {
    if (geminiSession) {
      geminiSession.close();
      geminiSession = null;
      responseQueue = [];
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
  res.sendFile(path.join(__dirname, "text-chat.html"));
});

app.get("/api/status", (req, res) => {
  res.json({
    status: "running",
    mode: "text-only",
    model: "gemini-live-2.5-flash-preview",
    hasApiKey: !!(
      process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY !== "your_api_key_here"
    ),
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Text Chat Server đang chạy tại http://localhost:${PORT}`);
  console.log(
    `📱 Mở trình duyệt và truy cập http://localhost:${PORT} để chat với Gemini`
  );

  if (
    !process.env.GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY === "your_api_key_here"
  ) {
    console.log("⚠️  Nhớ cập nhật API key trong file .env trước khi test!");
  }
});
