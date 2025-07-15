# 🎨 Gemini Live Frontend

Frontend Next.js application với TypeScript và Socket.io client cho Gemini Live Chat.

## 🏗️ **Công nghệ sử dụng**

- **Next.js 14** - React framework với App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Socket.io Client** - Real-time communication
- **Zustand** - State management
- **Lucide React** - Icons

## 📁 **Cấu trúc thư mục**

```
frontend/src/
├── app/                 # Next.js App Router
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page
├── components/          # React components
│   ├── ui/              # UI components
│   │   ├── Message.tsx
│   │   ├── ChatInput.tsx
│   │   ├── ChatMessages.tsx
│   │   ├── ConnectionStatus.tsx
│   │   └── MediaControls.tsx
│   └── Chat.tsx         # Main chat component
├── hooks/               # Custom React hooks
│   ├── useSocket.ts     # Socket.io hook
│   └── useScreenShare.ts # Screen sharing hook
├── lib/                 # Utilities
│   ├── socket.ts        # Socket.io service
│   ├── store.ts         # Zustand store
│   └── utils.ts         # Utility functions
└── types/               # TypeScript types
    └── socket.ts        # Socket.io types
```

## 🚀 **Cài đặt và chạy**

### 1. Cài đặt dependencies:

```bash
cd frontend
npm install
```

### 2. Cấu hình environment:

```bash
# File .env.local đã được tạo với cấu hình mặc định
# Cập nhật NEXT_PUBLIC_BACKEND_URL nếu cần
```

### 3. Chạy development server:

```bash
npm run dev
```

### 4. Build production:

```bash
npm run build
npm start
```

## 🔧 **Scripts**

- `npm run dev` - Development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript checking

## 🌐 **Features**

### ✨ **Core Features:**

- 💬 **Real-time Chat** - Trò chuyện với Gemini AI
- 📹 **Screen Sharing** - Chia sẻ màn hình và hỏi về nội dung
- 🖼️ **Frame Capture** - Capture frames từ video stream
- 🔄 **Auto-reconnect** - Tự động kết nối lại khi mất kết nối
- 📱 **Responsive Design** - Hoạt động tốt trên mọi thiết bị

### 🛠️ **Technical Features:**

- **TypeScript** - Type safety toàn bộ ứng dụng
- **Socket.io Client** - Real-time communication
- **Zustand Store** - State management hiệu quả
- **Custom Hooks** - Reusable logic
- **Error Handling** - Comprehensive error management
- **Loading States** - User feedback tốt

## 🔌 **Socket.io Integration**

### **Events gửi đến server:**

- `connect_gemini` - Kết nối với Gemini Live
- `sendText` - Gửi tin nhắn text
- `sendTextWithFrameSequence` - Gửi text với video frames
- `disconnect_gemini` - Ngắt kết nối Gemini

### **Events nhận từ server:**

- `connected` - Gemini đã kết nối
- `textChunk` - Nhận text streaming
- `turnComplete` - Phản hồi hoàn thành
- `processing` - Đang xử lý
- `error` - Lỗi xảy ra
- `disconnected` - Gemini đã ngắt kết nối

## 📊 **State Management**

Sử dụng **Zustand** để quản lý:

- **Connection state** - Trạng thái kết nối
- **Messages** - Tin nhắn chat
- **Media state** - Trạng thái chia sẻ màn hình
- **Frame sequence** - Frames được capture

## 🎨 **UI Components**

- **Chat** - Main chat interface
- **Message** - Individual message display
- **ChatInput** - Message input với send button
- **ChatMessages** - Messages container với auto-scroll
- **ConnectionStatus** - Connection status indicator
- **MediaControls** - Screen sharing controls

## ⚙️ **Environment Variables**

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=Gemini Live Chat
NEXT_PUBLIC_APP_VERSION=1.0.0
NODE_ENV=development
```

## 🧪 **Testing**

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build test
npm run build
```

## 🔗 **Kết nối với Backend**

Frontend tự động kết nối với backend tại `http://localhost:5000` và thiết lập:

1. **Socket.io connection**
2. **Gemini Live session**
3. **Event listeners**
4. **Error handling**
