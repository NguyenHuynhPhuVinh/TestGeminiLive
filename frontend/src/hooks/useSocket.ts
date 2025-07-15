'use client';

import { useEffect, useCallback } from 'react';
import { socketService } from '@/lib/socket';
import { useChatStore } from '@/lib/store';

export function useSocket() {
  const {
    setConnectionStatus,
    addMessage,
    updateCurrentAiMessage,
    finishCurrentAiMessage,
    setWaitingResponse,
  } = useChatStore();

  // Connect to Socket.io server
  const connect = useCallback(async () => {
    try {
      setConnectionStatus({ isConnecting: true, error: undefined });
      
      await socketService.connect();
      
      setConnectionStatus({ 
        isConnected: true, 
        isConnecting: false,
        error: undefined 
      });
      
      return true;
    } catch (error: any) {
      console.error('Failed to connect to Socket.io:', error);
      setConnectionStatus({ 
        isConnected: false, 
        isConnecting: false,
        error: error.message 
      });
      
      addMessage({
        type: 'error',
        content: `Không thể kết nối với server: ${error.message}`,
      });
      
      return false;
    }
  }, [setConnectionStatus, addMessage]);

  // Disconnect from Socket.io server
  const disconnect = useCallback(() => {
    socketService.disconnect();
    setConnectionStatus({ 
      isConnected: false, 
      isConnecting: false,
      error: undefined 
    });
  }, [setConnectionStatus]);

  // Connect to Gemini Live
  const connectGemini = useCallback(async (systemInstruction?: string) => {
    try {
      await socketService.connectGemini({ systemInstruction });
    } catch (error: any) {
      console.error('Failed to connect to Gemini:', error);
      addMessage({
        type: 'error',
        content: `Không thể kết nối với Gemini: ${error.message}`,
      });
    }
  }, [addMessage]);

  // Send text message
  const sendText = useCallback(async (text: string) => {
    try {
      setWaitingResponse(true);
      await socketService.sendText({ text });
    } catch (error: any) {
      console.error('Failed to send text:', error);
      addMessage({
        type: 'error',
        content: `Lỗi khi gửi tin nhắn: ${error.message}`,
      });
      setWaitingResponse(false);
    }
  }, [addMessage, setWaitingResponse]);

  // Send text with frame sequence
  const sendTextWithFrames = useCallback(async (
    text: string,
    frames: any[]
  ) => {
    try {
      setWaitingResponse(true);
      
      const totalSize = frames.reduce((sum, frame) => sum + frame.size, 0);
      
      await socketService.sendTextWithFrameSequence({
        text,
        frames,
        totalFrames: frames.length,
        totalSize,
      });
    } catch (error: any) {
      console.error('Failed to send text with frames:', error);
      addMessage({
        type: 'error',
        content: `Lỗi khi gửi tin nhắn với frames: ${error.message}`,
      });
      setWaitingResponse(false);
    }
  }, [addMessage, setWaitingResponse]);

  // Disconnect from Gemini
  const disconnectGemini = useCallback(async () => {
    try {
      await socketService.disconnectGemini();
    } catch (error: any) {
      console.error('Failed to disconnect from Gemini:', error);
    }
  }, []);

  // Setup event listeners
  useEffect(() => {
    if (!socketService.isConnected) return;

    // Gemini connection events
    socketService.onConnected((data) => {
      addMessage({
        type: 'ai',
        content: data.message,
      });
    });

    socketService.onTextChunk((data) => {
      updateCurrentAiMessage(data.text);
    });

    socketService.onTurnComplete(() => {
      finishCurrentAiMessage();
      setWaitingResponse(false);
    });

    socketService.onProcessing((data) => {
      addMessage({
        type: 'system',
        content: data.message,
      });
    });

    socketService.onError((data) => {
      addMessage({
        type: 'error',
        content: data.message,
      });
      setWaitingResponse(false);
    });

    socketService.onDisconnected((data) => {
      addMessage({
        type: 'system',
        content: data.message,
      });
    });

    socketService.onVideoReceived((data) => {
      addMessage({
        type: 'system',
        content: data.message,
      });
    });

    // Cleanup listeners on unmount
    return () => {
      socketService.removeAllListeners();
    };
  }, [
    addMessage,
    updateCurrentAiMessage,
    finishCurrentAiMessage,
    setWaitingResponse,
  ]);

  return {
    connect,
    disconnect,
    connectGemini,
    disconnectGemini,
    sendText,
    sendTextWithFrames,
    isConnected: socketService.isConnected,
  };
}
