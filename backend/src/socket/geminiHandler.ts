import { Socket } from 'socket.io';
import { GeminiService } from '@/services/geminiService';
import { logger } from '@/utils/logger';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
  ConnectGeminiData,
  SendTextData,
  SendTextWithFrameSequenceData,
  GeminiMessage,
} from '@/types';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

export class GeminiHandler {
  private geminiService: GeminiService;

  constructor() {
    this.geminiService = new GeminiService();
  }

  handleConnection(socket: TypedSocket): void {
    logger.info(`🔗 Client connected: ${socket.id}`);

    // Initialize socket data
    socket.data.geminiSession = null;

    // Handle Gemini connection
    socket.on('connect_gemini', async (data: ConnectGeminiData) => {
      await this.handleConnectGemini(socket, data);
    });

    // Handle text messages
    socket.on('sendText', async (data: SendTextData) => {
      await this.handleSendText(socket, data);
    });

    // Handle text with frame sequence
    socket.on('sendTextWithFrameSequence', async (data: SendTextWithFrameSequenceData) => {
      await this.handleSendTextWithFrameSequence(socket, data);
    });

    // Handle Gemini disconnection
    socket.on('disconnect_gemini', () => {
      this.handleDisconnectGemini(socket);
    });

    // Handle client disconnect
    socket.on('disconnect', (reason) => {
      logger.info(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
      this.handleDisconnectGemini(socket);
    });
  }

  private async handleConnectGemini(socket: TypedSocket, data: ConnectGeminiData): Promise<void> {
    try {
      logger.info('🔗 Connecting to Gemini Live (Text Only)...');

      const session = await this.geminiService.createSession(
        data.systemInstruction || '',
        (message: GeminiMessage) => this.handleGeminiMessage(socket, message),
        (error) => this.handleGeminiError(socket, error),
        (reason) => this.handleGeminiClose(socket, reason)
      );

      socket.data.geminiSession = session;

      socket.emit('connected', {
        message: 'Đã kết nối với Gemini Live (Text Only)',
      });

      logger.info('✅ Gemini session created for client:', socket.id);
    } catch (error: any) {
      logger.error('❌ Failed to connect to Gemini:', error);
      socket.emit('error', {
        message: `Không thể kết nối với Gemini Live: ${error.message}`,
      });
    }
  }

  private async handleSendText(socket: TypedSocket, data: SendTextData): Promise<void> {
    if (!socket.data.geminiSession) {
      socket.emit('error', {
        message: 'Chưa kết nối với Gemini Live',
      });
      return;
    }

    try {
      logger.info('📤 Sending text only to Gemini:', data.text);

      this.geminiService.sendTextOnly(socket.data.geminiSession, data.text);

      socket.emit('processing', {
        message: 'Đang xử lý tin nhắn...',
      });
    } catch (error: any) {
      logger.error('❌ Error sending text:', error);
      socket.emit('error', {
        message: `Lỗi khi gửi tin nhắn: ${error.message}`,
      });
    }
  }

  private async handleSendTextWithFrameSequence(
    socket: TypedSocket, 
    data: SendTextWithFrameSequenceData
  ): Promise<void> {
    if (!socket.data.geminiSession) {
      socket.emit('error', {
        message: 'Chưa kết nối với Gemini Live',
      });
      return;
    }

    try {
      logger.info(`📤 Sending text with ${data.totalFrames} frames:`, data.text);

      this.geminiService.sendTextWithFrames(socket.data.geminiSession, data);

      socket.emit('processing', {
        message: `Đang xử lý tin nhắn với ${data.totalFrames} frames...`,
      });
    } catch (error: any) {
      logger.error('❌ Error sending text with frames:', error);
      socket.emit('error', {
        message: `Lỗi khi gửi tin nhắn với frames: ${error.message}`,
      });
    }
  }

  private handleDisconnectGemini(socket: TypedSocket): void {
    if (socket.data.geminiSession) {
      this.geminiService.closeSession(socket.data.geminiSession);
      socket.data.geminiSession = null;
    }
  }

  private handleGeminiMessage(socket: TypedSocket, message: GeminiMessage): void {
    // Ưu tiên xử lý message.text trước
    if (message.text) {
      logger.debug('📝 Sending text chunk:', message.text);
      socket.emit('textChunk', { text: message.text });
    }
    // Xử lý modelTurn.parts nếu không có message.text
    else if (message.serverContent?.modelTurn?.parts) {
      const textParts = message.serverContent.modelTurn.parts
        .filter((part) => part.text)
        .map((part) => part.text!);
      
      if (textParts.length > 0) {
        const combinedText = textParts.join(' ');
        logger.debug('📝 Sending model turn parts:', combinedText);
        socket.emit('textChunk', { text: combinedText });
      }
    }

    // Báo hiệu turn complete
    if (message.serverContent?.turnComplete) {
      logger.debug('✅ Turn complete');
      socket.emit('turnComplete');
    }
  }

  private handleGeminiError(socket: TypedSocket, error: any): void {
    logger.error('❌ Gemini error:', error.message);
    socket.emit('error', {
      message: error.message,
    });
  }

  private handleGeminiClose(socket: TypedSocket, reason: string): void {
    logger.info('🔌 Gemini connection closed:', reason);
    socket.emit('disconnected', {
      message: 'Đã ngắt kết nối với Gemini Live',
    });
  }
}
