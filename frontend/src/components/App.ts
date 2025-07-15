import { socketService } from '../socketService';
import { Header, HeaderState } from './Header/Header';
import { ChatContainer } from './Chat/ChatContainer';
import { Settings, SettingsData } from './Settings/Settings';
import { ScreenShare } from './ScreenShare/ScreenShare';

export class App {
  private container: HTMLElement;
  private header: Header;
  private chatContainer: ChatContainer;
  private settings: Settings;
  private screenShare: ScreenShare;
  
  // State
  private isSocketConnected = false;
  private isGeminiConnected = false;
  private isWaitingResponse = false;
  
  // Media capture
  private mediaStream: MediaStream | null = null;
  private isRecording = false;
  private frameSequence: any[] = [];
  private frameInterval: NodeJS.Timeout | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private currentSourceName = '';

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLElement;
    if (!this.container) {
      throw new Error(`Container element with id "${containerId}" not found`);
    }
    
    this.setupAppContainer();
    
    // Initialize components
    this.header = new Header(this.container);
    this.chatContainer = new ChatContainer(this.container);
    this.screenShare = new ScreenShare(this.container);
    this.settings = new Settings(document.body);
    
    // Setup event handlers
    this.setupEventHandlers();
    
    // Connect to socket server
    this.connectToSocketServer();
  }
  
  private setupAppContainer(): void {
    this.container.className = 'flex flex-col h-screen bg-[var(--bg-primary)]';
  }
  
  private setupEventHandlers(): void {
    // Header events
    this.header.onConnect(() => {
      this.toggleGeminiConnection();
    });
    
    this.header.onSettings(() => {
      this.settings.show();
    });
    
    // Chat events
    this.chatContainer.onSend((text) => {
      this.sendMessage(text);
    });
    
    // Settings events
    this.settings.onSave((settings) => {
      this.applySettings(settings);
    });
    
    // Screen share events
    this.screenShare.onStart((sourceId) => {
      this.startScreenCapture(sourceId);
    });
    
    this.screenShare.onStop(() => {
      this.stopScreenCapture();
    });
    
    // Socket events
    this.setupSocketSubscriptions();
  }
  
  private setupSocketSubscriptions(): void {
    // Socket connection state changes
    socketService.onConnectionStateChanged((state) => {
      this.isSocketConnected = state.isConnected;
      this.updateHeaderState();
    });
    
    // Gemini connected
    socketService.onGeminiConnectedCallback((message) => {
      this.isGeminiConnected = true;
      this.updateHeaderState();
      this.chatContainer.addMessage('system', message);
      this.chatContainer.setInputEnabled(true);
      this.screenShare.setEnabled(true);
    });
    
    // Text chunks from AI
    socketService.onTextChunk((text) => {
      this.chatContainer.hideTypingIndicator();
      this.chatContainer.appendToAiMessage(text);
    });
    
    // Turn complete
    socketService.onTurnCompleted(() => {
      this.chatContainer.finishAiMessage();
      this.isWaitingResponse = false;
      this.chatContainer.setInputEnabled(true);
    });
    
    // Gemini error
    socketService.onGeminiErrorCallback((message) => {
      this.chatContainer.hideTypingIndicator();
      this.chatContainer.addMessage('error', message);
      this.isWaitingResponse = false;
      this.chatContainer.setInputEnabled(true);
    });
    
    // Processing
    socketService.onProcessingCallback((message) => {
      this.chatContainer.showTypingIndicator();
    });
  }
  
  private connectToSocketServer(): void {
    const settings = this.settings.getSettings();
    socketService.connect(settings.serverUrl);
  }
  
  private toggleGeminiConnection(): void {
    if (this.isGeminiConnected) {
      this.disconnectFromGemini();
    } else {
      this.connectToGemini();
    }
  }
  
  private connectToGemini(): void {
    if (!this.isSocketConnected) {
      this.chatContainer.addMessage('error', 'Chưa kết nối với server');
      return;
    }
    
    this.header.setConnectButtonLoading(true);
    this.updateHeaderState({
      isSocketConnected: this.isSocketConnected,
      isGeminiConnected: false,
      statusText: '🟡 Đang kết nối Gemini...'
    });
    
    const settings = this.settings.getSettings();
    socketService.connectToGemini(settings.systemInstruction);
  }
  
  private disconnectFromGemini(): void {
    this.isGeminiConnected = false;
    this.updateHeaderState();
    this.chatContainer.setInputEnabled(false);
    this.screenShare.setEnabled(false);
    this.stopScreenCapture();
  }
  
  private sendMessage(text: string): void {
    if (!text || !this.isGeminiConnected || this.isWaitingResponse) return;
    
    this.chatContainer.addMessage('user', text);
    
    // Notify if sending with video
    if (this.isRecording) {
      this.chatContainer.addMessage('system', '📹 Đang gửi câu hỏi kèm video context đến Gemini...');
    }
    
    this.isWaitingResponse = true;
    this.chatContainer.setInputEnabled(false);
    
    // Send message with or without frames
    if (this.isRecording && this.frameSequence.length > 0) {
      this.sendTextWithFrameSequence(text, this.frameSequence);
      // Clear all old frames and start a new sequence
      this.clearFrameSequence();
    } else {
      // Send text only if no frames
      socketService.sendMessage(text);
    }
  }
  
  private async sendTextWithFrameSequence(text: string, frameSequence: any[]): Promise<void> {
    try {
      console.log(`📤 Sending text with ${frameSequence.length} frames:`, text);
      
      // Convert all frames to base64
      const frameDataArray = [];
      let totalSize = 0;
      
      for (let i = 0; i < frameSequence.length; i++) {
        const frame = frameSequence[i];
        const arrayBuffer = await frame.blob.arrayBuffer();
        const base64Data = btoa(
          String.fromCharCode(...new Uint8Array(arrayBuffer))
        );
        
        frameDataArray.push({
          data: base64Data,
          mimeType: frame.blob.type,
          timestamp: frame.timestamp,
          size: frame.size,
        });
        
        totalSize += frame.size;
      }
      
      console.log(
        `📊 Total frames: ${frameSequence.length}, Total size: ${Math.round(
          totalSize / 1024
        )}KB`
      );
      
      // Send text with all frames
      socketService.sendMessageWithFrames(text, frameDataArray);
    } catch (error) {
      console.error('Error sending text with frame sequence:', error);
      // Fallback: send text only
      socketService.sendMessage(text);
    }
  }
  
  private clearFrameSequence(): void {
    console.log(`🗑️ Clearing ${this.frameSequence.length} old frames`);
    this.frameSequence = [];
    this.screenShare.setStatus('📸 Đã xóa frames cũ - Đang thu thập frames mới...');
  }
  
  private updateHeaderState(state?: HeaderState): void {
    const headerState: HeaderState = state || {
      isSocketConnected: this.isSocketConnected,
      isGeminiConnected: this.isGeminiConnected,
      statusText: this.getStatusText()
    };
    
    this.header.updateState(headerState);
  }
  
  private getStatusText(): string {
    if (!this.isSocketConnected) {
      return '🔴 Mất kết nối server';
    } else if (this.isGeminiConnected) {
      return '🟢 Đã kết nối Gemini';
    } else {
      return '🟡 Đã kết nối server';
    }
  }
  
  private applySettings(settings: SettingsData): void {
    console.log('Applying settings:', settings);
    // If server URL changed, reconnect
    const currentSettings = this.settings.getSettings();
    if (currentSettings.serverUrl !== settings.serverUrl) {
      socketService.disconnect();
      setTimeout(() => {
        socketService.connect(settings.serverUrl);
      }, 500);
    }
  }
  
  private async startScreenCapture(sourceId: string): Promise<void> {
    try {
      console.log('Starting screen capture for source:', sourceId);
      
      // Use getUserMedia with the selected desktop source
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            minWidth: 640,
            maxWidth: 1280,
            minHeight: 480,
            maxHeight: 720,
          },
        } as any,
      });
      
      // Get source name from the sourceId
      const electronAPI = (window as any).electronAPI;
      const sources = await electronAPI.getDesktopSources();
      const source = sources.find((s: any) => s.id === sourceId);
      this.currentSourceName = source ? source.name : 'Màn hình';
      
      this.setupVideoFrameCapture();
      this.screenShare.setSharingState(true, this.currentSourceName);
    } catch (error: any) {
      console.error('Error starting screen capture:', error);
      this.screenShare.setStatus(`❌ Không thể chia sẻ màn hình: ${error.message}`);
    }
  }
  
  private setupVideoFrameCapture(): void {
    console.log('Setting up video frame capture');
    
    // Create video element to display stream
    this.videoElement = document.createElement('video');
    this.videoElement.srcObject = this.mediaStream;
    this.videoElement.muted = true;
    this.videoElement.autoplay = true;
    
    // Add event listeners for debugging
    this.videoElement.onloadstart = () => console.log('📹 Video load started');
    this.videoElement.oncanplay = () => console.log('📹 Video can play');
    this.videoElement.onplay = () => console.log('📹 Video playing');
    this.videoElement.onerror = (e) => console.error('📹 Video error:', e);
    
    this.videoElement.play();
    
    // Create canvas to capture frames
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    const settings = this.settings.getSettings();
    
    this.videoElement.onloadedmetadata = () => {
      // Optimize resolution to reduce file size
      const maxWidth = 1280;
      const maxHeight = 720;
      
      let { videoWidth, videoHeight } = this.videoElement!;
      
      // Scale down if too large
      if (videoWidth > maxWidth || videoHeight > maxHeight) {
        const ratio = Math.min(maxWidth / videoWidth, maxHeight / videoHeight);
        videoWidth = Math.floor(videoWidth * ratio);
        videoHeight = Math.floor(videoHeight * ratio);
      }
      
      this.canvas!.width = videoWidth;
      this.canvas!.height = videoHeight;
      
      console.log(
        '📹 Optimized dimensions:',
        this.canvas!.width,
        'x',
        this.canvas!.height
      );
      
      // Capture first frame
      this.captureCurrentFrame();
      
      // Capture frame at specified interval
      this.frameInterval = setInterval(() => {
        try {
          this.captureCurrentFrame();
        } catch (error) {
          console.warn('⚠️ Frame capture error:', error);
        }
      }, settings.frameInterval);
      
      this.isRecording = true;
      this.screenShare.setStatus('📹 Đang capture frames - Sẵn sàng cho câu hỏi');
    };
  }
  
  private captureCurrentFrame(): void {
    if (!this.videoElement || !this.canvas || !this.isRecording) return;
    
    try {
      // Draw current video frame to canvas
      this.ctx!.drawImage(
        this.videoElement,
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );
      
      const settings = this.settings.getSettings();
      
      // Convert to JPEG blob with optimized compression
      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            // Add frame to sequence
            this.frameSequence.push({
              blob: blob,
              timestamp: Date.now(),
              size: blob.size,
            });
            
            // Limit number of frames (FIFO - First In First Out)
            if (this.frameSequence.length > settings.maxFrames) {
              this.frameSequence.shift(); // Remove oldest frame
            }
            
            const sizeKB = Math.round(blob.size / 1024);
            const totalFrames = this.frameSequence.length;
            console.log(
              `📸 Frame ${totalFrames} captured:`,
              blob.size,
              'bytes',
              `(${sizeKB}KB)`
            );
            
            // Warning if file is too large
            if (sizeKB > 500) {
              console.warn('⚠️ Frame size is large:', sizeKB, 'KB');
            }
            
            this.screenShare.setStatus(`📸 ${totalFrames} frames sẵn sàng - Hãy hỏi!`);
          } else {
            console.error('❌ Failed to capture frame');
          }
        },
        'image/jpeg',
        settings.frameQuality
      );
    } catch (error) {
      console.error('Error capturing frame:', error);
    }
  }
  
  private stopScreenCapture(): void {
    this.isRecording = false;
    this.frameSequence = [];
    
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    
    this.screenShare.setSharingState(false);
    this.currentSourceName = '';
  }
}
