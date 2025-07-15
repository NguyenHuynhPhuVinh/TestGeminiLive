'use client';

import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
  error?: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function ConnectionStatus({
  isConnected,
  isConnecting,
  error,
  onConnect,
  onDisconnect,
}: ConnectionStatusProps) {
  const getStatusText = () => {
    if (isConnecting) return '🟡 Đang kết nối...';
    if (isConnected) return '🟢 Đã kết nối';
    if (error) return `🔴 Lỗi: ${error}`;
    return '🔴 Chưa kết nối';
  };

  const getStatusColor = () => {
    if (isConnecting) return 'text-yellow-600';
    if (isConnected) return 'text-green-600';
    if (error) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center gap-3">
        {isConnecting ? (
          <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
        ) : isConnected ? (
          <Wifi className="w-5 h-5 text-green-500" />
        ) : (
          <WifiOff className="w-5 h-5 text-red-500" />
        )}
        
        <span className={cn('font-medium', getStatusColor())}>
          {getStatusText()}
        </span>
      </div>

      <button
        onClick={isConnected ? onDisconnect : onConnect}
        disabled={isConnecting}
        className={cn(
          'px-4 py-2 rounded-lg font-medium transition-colors duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isConnected
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        )}
      >
        {isConnecting ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang kết nối...
          </span>
        ) : isConnected ? (
          'Ngắt kết nối'
        ) : (
          'Kết nối'
        )}
      </button>
    </div>
  );
}
