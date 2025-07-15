"use client";

import { useCallback, useRef } from "react";
import { useChatStore } from "@/lib/store";
import { blobToBase64 } from "@/lib/utils";
import { CapturedFrame, FrameData } from "@/types/socket";

export function useScreenShare() {
  const { media, setMediaState, addFrame, clearFrames, setMediaStatus } =
    useChatStore();

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    try {
      setMediaStatus("🔄 Đang yêu cầu quyền chia sẻ màn hình...");

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      // Create video element
      const videoElement = document.createElement("video");
      videoElement.srcObject = stream;
      videoElement.play();
      videoElementRef.current = videoElement;

      // Create canvas for frame capture
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvasRef.current = canvas;

      videoElement.onloadedmetadata = () => {
        // Optimize resolution
        const maxWidth = 1280;
        const maxHeight = 720;

        let { videoWidth, videoHeight } = videoElement;

        if (videoWidth > maxWidth || videoHeight > maxHeight) {
          const ratio = Math.min(
            maxWidth / videoWidth,
            maxHeight / videoHeight
          );
          videoWidth = Math.floor(videoWidth * ratio);
          videoHeight = Math.floor(videoHeight * ratio);
        }

        canvas.width = videoWidth;
        canvas.height = videoHeight;

        console.log(
          "📹 Optimized dimensions:",
          canvas.width,
          "x",
          canvas.height
        );

        // Capture first frame
        captureFrame();

        // Start interval capture (every 1 second)
        frameIntervalRef.current = setInterval(captureFrame, 1000);

        setMediaState({
          isRecording: true,
          mediaStream: stream,
        });

        setMediaStatus("📹 Đang capture frames - Sẵn sàng cho câu hỏi");
      };

      // Handle stream end
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (error: any) {
      console.error("Error starting screen share:", error);
      setMediaStatus(`❌ Không thể chia sẻ màn hình: ${error.message}`);
    }
  }, [setMediaState, setMediaStatus]);

  // Capture current frame
  const captureFrame = useCallback(() => {
    const videoElement = videoElementRef.current;
    const canvas = canvasRef.current;

    if (!videoElement || !canvas || !media.isRecording) return;

    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw current video frame to canvas
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // Convert to JPEG blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const frame: CapturedFrame = {
              blob,
              timestamp: Date.now(),
              size: blob.size,
            };

            addFrame(frame);

            const sizeKB = Math.round(blob.size / 1024);
            console.log(`📸 Frame captured: ${sizeKB}KB`);

            if (sizeKB > 500) {
              console.warn("⚠️ Frame size large:", sizeKB, "KB");
            }
          }
        },
        "image/jpeg",
        0.7 // Quality
      );
    } catch (error) {
      console.error("Error capturing frame:", error);
    }
  }, [media.isRecording, addFrame]);

  // Stop screen sharing
  const stopScreenShare = useCallback(() => {
    // Clear interval
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    // Stop media stream
    if (media.mediaStream) {
      media.mediaStream.getTracks().forEach((track) => track.stop());
    }

    // Clean up elements
    if (videoElementRef.current) {
      videoElementRef.current.pause();
      videoElementRef.current.srcObject = null;
      videoElementRef.current = null;
    }

    canvasRef.current = null;

    // Clear frames
    clearFrames();

    // Update state
    setMediaState({
      isRecording: false,
      mediaStream: null,
    });

    setMediaStatus("");
  }, [media.mediaStream, clearFrames, setMediaState, setMediaStatus]);

  // Convert frames to FrameData format
  const convertFramesToFrameData = useCallback(
    async (frames: CapturedFrame[]): Promise<FrameData[]> => {
      const frameDataArray: FrameData[] = [];

      for (const frame of frames) {
        try {
          const base64Data = await blobToBase64(frame.blob);

          frameDataArray.push({
            data: base64Data,
            mimeType: frame.blob.type,
            timestamp: frame.timestamp,
            size: frame.size,
          });
        } catch (error) {
          console.error("Error converting frame to base64:", error);
        }
      }

      return frameDataArray;
    },
    []
  );

  return {
    startScreenShare,
    stopScreenShare,
    captureFrame,
    convertFramesToFrameData,
    isRecording: media.isRecording,
    frameCount: media.frameSequence.length,
    mediaStatus: media.status,
  };
}
