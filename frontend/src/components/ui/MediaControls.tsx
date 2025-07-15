'use client';

import { Monitor, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaControlsProps {
  isRecording: boolean;
  frameCount: number;
  mediaStatus: string;
  onStartScreenShare: () => void;
  onStopScreenShare: () => void;
  disabled?: boolean;
}

export function MediaControls({
  isRecording,
  frameCount,
  mediaStatus,
  onStartScreenShare,
  onStopScreenShare,
  disabled = false,
}: MediaControlsProps) {
  return (
    <div className="p-4 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={onStartScreenShare}
          disabled={disabled || isRecording}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium',
            'transition-colors duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            isRecording
              ? 'bg-red-500 text-white'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          )}
        >
          <Monitor className="w-4 h-4" />
          {isRecording ? 'Đang chia sẻ màn hình' : 'Chia sẻ màn hình'}
        </button>

        {isRecording && (
          <button
            onClick={onStopScreenShare}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
          >
            <Square className="w-4 h-4" />
            Dừng
          </button>
        )}

        {isRecording && frameCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">
              {frameCount} frames
            </span>
          </div>
        )}
      </div>

      {mediaStatus && (
        <div className="text-sm text-gray-600 bg-white p-3 rounded-lg border">
          {mediaStatus.includes('Đang') && (
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
          )}
          {mediaStatus}
        </div>
      )}

      {isRecording && (
        <div className="mt-3 text-xs text-gray-500 bg-blue-50 p-2 rounded border-l-4 border-blue-400">
          💡 <strong>Tip:</strong> Hãy hỏi về nội dung trên màn hình! 
          AI sẽ phân tích {frameCount} frames đã capture được.
        </div>
      )}
    </div>
  );
}
