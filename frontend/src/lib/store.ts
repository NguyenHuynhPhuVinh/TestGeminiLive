'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { 
  Message, 
  ConnectionStatus, 
  MediaState, 
  CapturedFrame,
  FrameData 
} from '@/types/socket';

interface ChatState {
  // Connection state
  connection: ConnectionStatus;
  
  // Messages
  messages: Message[];
  currentAiMessage: Message | null;
  isWaitingResponse: boolean;
  
  // Media state
  media: MediaState;
  
  // Actions
  setConnectionStatus: (status: Partial<ConnectionStatus>) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateCurrentAiMessage: (content: string) => void;
  finishCurrentAiMessage: () => void;
  clearMessages: () => void;
  setWaitingResponse: (waiting: boolean) => void;
  
  // Media actions
  setMediaState: (state: Partial<MediaState>) => void;
  addFrame: (frame: CapturedFrame) => void;
  clearFrames: () => void;
  setMediaStatus: (status: string) => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set, get) => ({
      // Initial state
      connection: {
        isConnected: false,
        isConnecting: false,
      },
      
      messages: [
        {
          id: 'welcome',
          type: 'system',
          content: 'Chào mừng bạn đến với Gemini Live Chat! Nhấn "Kết nối" để bắt đầu trò chuyện.',
          timestamp: new Date(),
        },
      ],
      
      currentAiMessage: null,
      isWaitingResponse: false,
      
      media: {
        isRecording: false,
        mediaStream: null,
        frameSequence: [],
        status: '',
      },
      
      // Connection actions
      setConnectionStatus: (status) =>
        set((state) => ({
          connection: { ...state.connection, ...status },
        })),
      
      // Message actions
      addMessage: (message) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...message,
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              timestamp: new Date(),
            },
          ],
        })),
      
      updateCurrentAiMessage: (content) =>
        set((state) => {
          if (!state.currentAiMessage) {
            // Create new AI message
            const newMessage: Message = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              type: 'ai',
              content,
              timestamp: new Date(),
              isStreaming: true,
            };
            
            return {
              currentAiMessage: newMessage,
              messages: [...state.messages, newMessage],
            };
          } else {
            // Update existing message
            const updatedMessage = {
              ...state.currentAiMessage,
              content: state.currentAiMessage.content + content,
            };
            
            return {
              currentAiMessage: updatedMessage,
              messages: state.messages.map((msg) =>
                msg.id === state.currentAiMessage?.id ? updatedMessage : msg
              ),
            };
          }
        }),
      
      finishCurrentAiMessage: () =>
        set((state) => {
          if (state.currentAiMessage) {
            const finishedMessage = {
              ...state.currentAiMessage,
              isStreaming: false,
            };
            
            return {
              currentAiMessage: null,
              messages: state.messages.map((msg) =>
                msg.id === state.currentAiMessage?.id ? finishedMessage : msg
              ),
            };
          }
          return { currentAiMessage: null };
        }),
      
      clearMessages: () =>
        set({
          messages: [],
          currentAiMessage: null,
        }),
      
      setWaitingResponse: (waiting) =>
        set({ isWaitingResponse: waiting }),
      
      // Media actions
      setMediaState: (state) =>
        set((prevState) => ({
          media: { ...prevState.media, ...state },
        })),
      
      addFrame: (frame) =>
        set((state) => {
          const newFrames = [...state.media.frameSequence, frame];
          // Limit to max 30 frames (FIFO)
          if (newFrames.length > 30) {
            newFrames.shift();
          }
          
          return {
            media: {
              ...state.media,
              frameSequence: newFrames,
            },
          };
        }),
      
      clearFrames: () =>
        set((state) => ({
          media: {
            ...state.media,
            frameSequence: [],
          },
        })),
      
      setMediaStatus: (status) =>
        set((state) => ({
          media: {
            ...state.media,
            status,
          },
        })),
    }),
    {
      name: 'gemini-chat-store',
    }
  )
);
