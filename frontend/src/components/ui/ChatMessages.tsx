'use client';

import { useEffect, useRef } from 'react';
import { Message } from './Message';
import { Message as MessageType } from '@/types/socket';
import { Loader2 } from 'lucide-react';

interface ChatMessagesProps {
  messages: MessageType[];
  isWaitingResponse: boolean;
}

export function ChatMessages({ messages, isWaitingResponse }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isWaitingResponse]);

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        
        {isWaitingResponse && (
          <div className="mb-4 p-3 rounded-lg max-w-[80%] bg-gray-100 border border-gray-200 mr-auto">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">🤖</span>
              <span className="text-xs opacity-70">Gemini</span>
              <Loader2 className="w-3 h-3 animate-spin opacity-70" />
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <span>Đang suy nghĩ</span>
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
