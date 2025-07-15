'use client';

import { useState, KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({ 
  onSendMessage, 
  disabled = false, 
  isLoading = false,
  placeholder = "Nhập tin nhắn..."
}: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled || isLoading) return;

    onSendMessage(trimmedMessage);
    setMessage('');
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-3 p-4 bg-white border-t border-gray-200">
      <div className="flex-1 relative">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            "w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-full",
            "resize-none focus:outline-none focus:border-blue-500",
            "disabled:bg-gray-100 disabled:cursor-not-allowed",
            "transition-colors duration-200"
          )}
          style={{
            minHeight: '48px',
            maxHeight: '120px',
          }}
        />
        
        <button
          onClick={handleSend}
          disabled={disabled || isLoading || !message.trim()}
          className={cn(
            "absolute right-2 top-1/2 transform -translate-y-1/2",
            "p-2 rounded-full transition-colors duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            message.trim() && !disabled && !isLoading
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-gray-200 text-gray-400"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
