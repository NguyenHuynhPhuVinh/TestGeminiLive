'use client';

import { useEffect, useState } from 'react';
import { useChatStore } from '@/lib/store';
import { useSocket } from '@/hooks/useSocket';
import { useScreenShare } from '@/hooks/useScreenShare';
import { ConnectionStatus } from './ui/ConnectionStatus';
import { MediaControls } from './ui/MediaControls';
import { ChatMessages } from './ui/ChatMessages';
import { ChatInput } from './ui/ChatInput';

export function Chat() {
  const {
    connection,
    messages,
    isWaitingResponse,
    media,
    addMessage,
    clearFrames,
  } = useChatStore();

  const {
    connect,
    disconnect,
    connectGemini,
    disconnectGemini,
    sendText,
    sendTextWithFrames,
    isConnected,
  } = useSocket();

  const {
    startScreenShare,
    stopScreenShare,
    convertFramesToFrameData,
    isRecording,
    frameCount,
    mediaStatus,
  } = useScreenShare();

  const [isGeminiConnected, setIsGeminiConnected] = useState(false);

  // Auto connect to Gemini when Socket.io connects
  useEffect(() => {
    if (connection.isConnected && !isGeminiConnected) {
      handleConnectGemini();
    }
  }, [connection.isConnected, isGeminiConnected]);

  const handleConnect = async () => {
    const success = await connect();
    if (success) {
      // Will auto-connect to Gemini via useEffect
    }
  };

  const handleDisconnect = () => {
    if (isGeminiConnected) {
      disconnectGemini();
      setIsGeminiConnected(false);
    }
    disconnect();
    stopScreenShare();
  };

  const handleConnectGemini = async () => {
    try {
      await connectGemini(
        'Bạn là một trợ lý AI thông minh có thể xem và phân tích hình ảnh từ màn hình người dùng. Khi nhận được hình ảnh, hãy mô tả chi tiết và chính xác những gì bạn thấy. Trả lời bằng tiếng Việt thân thiện, cụ thể và hữu ích.'
      );
      setIsGeminiConnected(true);
    } catch (error) {
      console.error('Failed to connect to Gemini:', error);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!connection.isConnected || !isGeminiConnected) {
      addMessage({
        type: 'error',
        content: 'Chưa kết nối với server hoặc Gemini',
      });
      return;
    }

    // Add user message to chat
    addMessage({
      type: 'user',
      content: text,
    });

    try {
      // Check if we have frames to send
      if (isRecording && media.frameSequence.length > 0) {
        addMessage({
          type: 'system',
          content: `📹 Đang gửi câu hỏi kèm ${media.frameSequence.length} frames từ màn hình...`,
        });

        // Convert frames to FrameData format
        const frameData = await convertFramesToFrameData(media.frameSequence);
        
        // Send text with frames
        await sendTextWithFrames(text, frameData);
        
        // Clear frames after sending
        clearFrames();
      } else {
        // Send text only
        await sendText(text);
      }
    } catch (error: any) {
      addMessage({
        type: 'error',
        content: `Lỗi khi gửi tin nhắn: ${error.message}`,
      });
    }
  };

  const handleStartScreenShare = async () => {
    try {
      await startScreenShare();
    } catch (error: any) {
      addMessage({
        type: 'error',
        content: `Lỗi khi bắt đầu chia sẻ màn hình: ${error.message}`,
      });
    }
  };

  const handleStopScreenShare = () => {
    stopScreenShare();
    addMessage({
      type: 'system',
      content: '⏹️ Đã dừng chia sẻ màn hình',
    });
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-green-500 text-white p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">💬 Gemini Live Chat</h1>
        <p className="text-blue-100">Trò chuyện với AI và chia sẻ màn hình</p>
      </div>

      {/* Connection Status */}
      <ConnectionStatus
        isConnected={connection.isConnected}
        isConnecting={connection.isConnecting}
        error={connection.error}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      {/* Media Controls */}
      <MediaControls
        isRecording={isRecording}
        frameCount={frameCount}
        mediaStatus={mediaStatus}
        onStartScreenShare={handleStartScreenShare}
        onStopScreenShare={handleStopScreenShare}
        disabled={!connection.isConnected}
      />

      {/* Chat Messages */}
      <ChatMessages
        messages={messages}
        isWaitingResponse={isWaitingResponse}
      />

      {/* Chat Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={!connection.isConnected || !isGeminiConnected}
        isLoading={isWaitingResponse}
        placeholder={
          isRecording && frameCount > 0
            ? `Hỏi về video đang chia sẻ (${frameCount} frames)...`
            : 'Nhập tin nhắn...'
        }
      />
    </div>
  );
}
