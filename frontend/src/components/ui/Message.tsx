'use client';

import { Message as MessageType } from '@/types/socket';
import { formatTime, cn } from '@/lib/utils';

interface MessageProps {
  message: MessageType;
}

export function Message({ message }: MessageProps) {
  const getMessageStyles = () => {
    switch (message.type) {
      case 'user':
        return 'bg-blue-500 text-white ml-auto border-b-r-sm';
      case 'ai':
        return 'bg-white border border-gray-200 mr-auto border-b-l-sm';
      case 'system':
        return 'bg-gray-100 text-gray-700 mx-auto text-center border-gray-300';
      case 'error':
        return 'bg-red-50 text-red-700 border border-red-200 mx-auto text-center';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getMessageIcon = () => {
    switch (message.type) {
      case 'user':
        return '👤';
      case 'ai':
        return '🤖';
      case 'system':
        return 'ℹ️';
      case 'error':
        return '❌';
      default:
        return '';
    }
  };

  return (
    <div
      className={cn(
        'mb-4 p-3 rounded-lg max-w-[80%] word-wrap break-words',
        getMessageStyles()
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">{getMessageIcon()}</span>
        <span className="text-xs opacity-70">
          {formatTime(message.timestamp)}
        </span>
        {message.isStreaming && (
          <span className="text-xs opacity-70 animate-pulse">
            Đang nhập...
          </span>
        )}
      </div>
      
      <div className="whitespace-pre-wrap">
        {message.content}
        {message.isStreaming && (
          <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
        )}
      </div>
    </div>
  );
}
