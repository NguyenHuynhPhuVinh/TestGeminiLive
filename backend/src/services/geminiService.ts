import { GoogleGenAI, Modality } from "@google/genai";
import { config } from "@/utils/config";
import { logger } from "@/utils/logger";
import {
  GeminiConfig,
  GeminiMessage,
  FrameData,
  SendTextWithFrameSequenceData,
  ApiError,
} from "@/types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: config.GEMINI_API_KEY,
    });
  }

  async createSession(
    systemInstruction: string,
    onMessage: (message: GeminiMessage) => void,
    onError: (error: ApiError) => void,
    onClose: (reason: string) => void
  ) {
    try {
      logger.info("🔗 Creating Gemini Live session...");

      const geminiConfig: GeminiConfig = {
        responseModalities: [Modality.TEXT], // CHỈ text response
        systemInstruction:
          systemInstruction ||
          "Bạn là một trợ lý AI thông minh có thể xem và phân tích hình ảnh từ màn hình người dùng. Khi nhận được hình ảnh, hãy mô tả chi tiết và chính xác những gì bạn thấy. Trả lời bằng tiếng Việt thân thiện, cụ thể và hữu ích.",
      };

      const session = await this.ai.live.connect({
        model: config.GEMINI_MODEL,
        callbacks: {
          onopen: () => {
            logger.info("✅ Gemini Live session opened");
          },
          onmessage: (msg: any) => {
            logger.debug(
              "📨 Received Gemini message:",
              typeof msg,
              Object.keys(msg)
            );
            onMessage(msg as GeminiMessage);
          },
          onerror: (error: any) => {
            logger.error("❌ Gemini session error:", error.message);
            onError({
              message: error.message,
              code: error.code,
            });
          },
          onclose: (event: any) => {
            logger.info("🔌 Gemini session closed:", event.reason);
            onClose(event.reason || "Connection closed");
          },
        },
        config: geminiConfig,
      });

      return session;
    } catch (error: any) {
      logger.error("❌ Failed to create Gemini session:", error);
      throw new Error(`Failed to connect to Gemini: ${error.message}`);
    }
  }

  sendTextOnly(session: any, text: string): void {
    try {
      logger.info("📤 Sending text to Gemini:", text);

      session.sendClientContent({
        turns: [text], // FIX: turns phải là array
        turnComplete: true,
      });
    } catch (error: any) {
      logger.error("❌ Error sending text:", error);
      throw new Error(`Failed to send text: ${error.message}`);
    }
  }

  sendTextWithFrames(session: any, data: SendTextWithFrameSequenceData): void {
    try {
      logger.info(
        `📤 Sending text with ${data.totalFrames} frames:`,
        data.text
      );
      logger.info(`📊 Total size: ${Math.round(data.totalSize / 1024)}KB`);

      // Kiểm tra kích thước
      if (data.totalSize > config.MAX_FRAME_SIZE) {
        logger.warn("⚠️ Frame sequence too large, sending text only");
        this.sendTextOnly(session, data.text);
        return;
      }

      // Tạo turns array với text + frames
      const turns: any[] = [data.text];

      // Thêm tất cả frames
      data.frames.forEach((frame: FrameData) => {
        turns.push({
          inlineData: {
            data: frame.data,
            mimeType: frame.mimeType,
          },
        });
      });

      logger.info(
        `🖼️ Sending ${data.totalFrames} frames via sendClientContent...`
      );

      session.sendClientContent({
        turns: turns,
        turnComplete: true,
      });
    } catch (error: any) {
      logger.error("❌ Error sending text with frames:", error);
      throw new Error(`Failed to send text with frames: ${error.message}`);
    }
  }

  closeSession(session: any): void {
    try {
      if (session) {
        session.close();
        logger.info("🔌 Gemini session closed");
      }
    } catch (error: any) {
      logger.error("❌ Error closing session:", error);
    }
  }
}
