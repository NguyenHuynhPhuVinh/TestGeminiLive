# 🚀 Gemini Live Backend

Backend Express server với Socket.io cho Gemini Live Chat application.

## 🏗️ **Kiến trúc**

- **Express.js** - Web framework
- **Socket.io** - Real-time communication
- **TypeScript** - Type safety
- **Gemini Live API** - AI integration

## 📁 **Cấu trúc thư mục**

```
backend/
├── src/
│   ├── controllers/     # API controllers
│   ├── services/        # Business logic
│   ├── middleware/      # Express middleware
│   ├── socket/          # Socket.io handlers
│   ├── utils/           # Utilities
│   ├── types/           # TypeScript types
│   └── server.ts        # Main server file
├── package.json
├── tsconfig.json
├── nodemon.json
└── .env
```

## 🚀 **Cài đặt và chạy**

### 1. Cài đặt dependencies:
```bash
cd backend
npm install
```

### 2. Cấu hình environment:
```bash
# File .env đã được tạo với cấu hình mặc định
# Cập nhật GEMINI_API_KEY nếu cần
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

- `npm run dev` - Development server với hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking

## 🌐 **API Endpoints**

- `GET /` - API information
- `GET /health` - Health check
- `GET /api/status` - Server status
- `Socket.io /` - WebSocket connection

## 🔌 **Socket.io Events**

### Client → Server:
- `connect_gemini` - Connect to Gemini Live
- `sendText` - Send text message
- `sendTextWithFrameSequence` - Send text with video frames
- `disconnect_gemini` - Disconnect from Gemini

### Server → Client:
- `connected` - Gemini connection established
- `textChunk` - Streaming text response
- `turnComplete` - Response complete
- `processing` - Processing message
- `error` - Error occurred
- `disconnected` - Gemini disconnected

## ⚙️ **Environment Variables**

```bash
PORT=5000
NODE_ENV=development
HOST=localhost
FRONTEND_URL=http://localhost:3000
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-live-2.5-flash-preview
SOCKET_CORS_ORIGIN=http://localhost:3000
MAX_FRAME_SIZE=15728640
MAX_FRAMES_PER_REQUEST=30
FRAME_QUALITY=0.7
LOG_LEVEL=info
```

## 🔒 **Security Features**

- **Helmet.js** - Security headers
- **CORS** - Cross-origin protection
- **Input validation** - Request validation
- **Error handling** - Comprehensive error management

## 📊 **Logging**

Server sử dụng custom logger với các levels:
- `ERROR` - Lỗi nghiêm trọng
- `WARN` - Cảnh báo
- `INFO` - Thông tin chung
- `DEBUG` - Debug information

## 🧪 **Testing**

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Health check
curl http://localhost:5000/health
```
