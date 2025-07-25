# 🎤 Gemini Live với Node.js

Ứng dụng demo tương tác âm thanh và text real-time với Gemini Live API.

## 🚀 Cài đặt và chạy

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình API key

1. Lấy API key từ [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Cập nhật file `.env`:

```bash
cp .env.example .env
# Chỉnh sửa .env và thay thế your_api_key_here bằng API key thực
```

### 3. Chạy ứng dụng

#### Web interface:

```bash
# Full web interface (text + audio)
npm run web
```

Mở trình duyệt: http://localhost:3000

```bash
# Text-only chat interface
npm run text-chat
```

Mở trình duyệt: http://localhost:3001

#### Test examples:

```bash
# Test text response đơn giản
npm run test-text

# Test text-only với Gemini Live API
npm run text-only

# Test với file âm thanh
npm run test-audio

# Test streaming
npm run test-streaming
```

## ✨ Tính năng

- 🔗 Kết nối với Gemini Live API qua WebSocket
- 💬 **Text response** - Nhận phản hồi bằng text từ Gemini
- 🎵 **Audio response** - Nhận phản hồi bằng âm thanh từ Gemini
- 🎤 Ghi âm từ microphone
- 🌐 Web interface thân thiện
- 📱 Responsive design

## 📁 Cấu trúc dự án

```
├── examples/
│   ├── basic-audio.js       # Test với file âm thanh
│   ├── streaming-audio.js   # Test streaming
│   └── test-text.js         # Test text response
├── public/
│   ├── index.html          # Web interface
│   └── app.js              # Frontend JavaScript
├── server.js               # Web server với WebSocket
├── package.json            # Dependencies
└── .env                    # Cấu hình API key
```

## 🎯 Cách sử dụng

### Web Interface

1. **Kết nối**: Nhấn "Kết nối Gemini Live"
2. **Chat text**: Nhập tin nhắn và nhấn Enter
3. **Ghi âm**: Nhấn "Bắt đầu ghi âm"
4. **Xem phản hồi**: Gemini sẽ trả lời bằng cả text và âm thanh

### Command Line

- `npm run test-text` - Test text response đơn giản
- `npm run test-audio` - Test với file âm thanh
- `npm run test-streaming` - Test streaming real-time

## ⚙️ Cấu hình

### Response Modalities:

- `TEXT` - Nhận phản hồi text
- `AUDIO` - Nhận phản hồi âm thanh
- `TEXT + AUDIO` - Nhận cả hai (mặc định)

### Models:

- `gemini-2.5-flash-preview-native-audio-dialog` (mặc định)
- `gemini-live-2.5-flash-preview`
- `gemini-2.0-flash-live-001`

## 🔧 Troubleshooting

1. **"Chưa cấu hình API key"** - Kiểm tra file `.env`
2. **"Không thể truy cập microphone"** - Cho phép quyền trong trình duyệt
3. **Lỗi symlink** - Sử dụng `npm install --no-bin-links`

## 🔗 Links

- [Gemini Live API Docs](https://ai.google.dev/gemini-api/docs/live-api)
- [Google AI Studio](https://aistudio.google.com/)
