# 🎥 Hướng dẫn Multimodal với Gemini Live

Hướng dẫn sử dụng tính năng **Video + Audio + Text** với Gemini Live API.

## ✨ Tính năng mới

### 📹 **Screen Sharing (Chia sẻ màn hình)**
- Capture video từ màn hình real-time
- Capture âm thanh hệ thống cùng lúc
- Stream trực tiếp đến Gemini Live

### 🎵 **Audio Capture (Ghi âm)**
- Ghi âm từ microphone
- Stream âm thanh real-time
- Chất lượng cao, độ trễ thấp

### 💬 **Text Questions về Media**
- Hỏi về nội dung video đang stream
- Hỏi về âm thanh đang nghe
- AI trả lời bằng text real-time

## 🚀 Cách sử dụng

### 1. Khởi chạy ứng dụng
```bash
npm run text-chat
```
Mở trình duyệt: http://localhost:3001

### 2. Kết nối với Gemini Live
- Nhấn **"Kết nối"**
- Chờ thông báo "Đã kết nối với Gemini Live"

### 3. Bắt đầu chia sẻ media

#### 📹 **Chia sẻ màn hình:**
1. Nhấn **"📹 Chia sẻ màn hình"**
2. Chọn màn hình/cửa sổ muốn chia sẻ
3. Cho phép capture âm thanh hệ thống
4. Bắt đầu stream video + audio đến Gemini

#### 🎵 **Ghi âm:**
1. Nhấn **"🎵 Ghi âm hệ thống"**
2. Cho phép quyền microphone
3. Bắt đầu stream âm thanh đến Gemini

### 4. Hỏi về nội dung
Trong khi đang stream, gõ câu hỏi như:
- *"Bạn thấy gì trên màn hình?"*
- *"Mô tả video đang phát"*
- *"Âm thanh này là gì?"*
- *"Có bao nhiều người trong video?"*
- *"Màu sắc chủ đạo là gì?"*

### 5. Nhận phản hồi
- AI sẽ trả lời bằng **text streaming**
- Phản hồi dựa trên video/audio real-time
- Có thể hỏi liên tục trong khi stream

### 6. Dừng stream
- Nhấn **"⏹️ Dừng"** để ngừng capture
- Hoặc đóng tab để tự động dừng

## 🔧 Cấu hình kỹ thuật

### **Video Format:**
- **Codec**: VP8 + Opus
- **Container**: WebM
- **Chunk size**: 1 giây
- **Real-time streaming**: ✅

### **Audio Format:**
- **Input**: PCM 16-bit, 16kHz
- **Codec**: Opus
- **Echo cancellation**: Tắt (để capture âm thanh hệ thống)
- **Real-time streaming**: ✅

### **Gemini Live API:**
- **Model**: gemini-live-2.5-flash-preview
- **Response**: TEXT only
- **Input**: VIDEO + AUDIO + TEXT
- **System instruction**: Tối ưu cho multimodal

## 🎯 Use Cases

### **1. Phân tích Video**
```
🎬 Đang phát video YouTube
💬 "Mô tả nội dung video này"
🤖 "Tôi thấy một video hướng dẫn nấu ăn..."
```

### **2. Hỗ trợ Presentation**
```
📊 Đang chia sẻ slide PowerPoint
💬 "Tóm tắt slide này"
🤖 "Slide này trình bày về..."
```

### **3. Phân tích Game**
```
🎮 Đang chơi game
💬 "Tôi nên làm gì tiếp theo?"
🤖 "Dựa vào màn hình, bạn nên..."
```

### **4. Học tập Online**
```
📚 Đang xem video học
💬 "Giải thích khái niệm này"
🤖 "Khái niệm trong video là..."
```

## ⚠️ Lưu ý quan trọng

### **Quyền truy cập:**
- **Screen sharing**: Cần cho phép chia sẻ màn hình
- **Audio capture**: Cần cho phép microphone
- **HTTPS**: Một số tính năng cần HTTPS trong production

### **Hiệu suất:**
- **Bandwidth**: Cần kết nối internet ổn định
- **CPU**: Screen capture có thể tốn CPU
- **Memory**: Video chunks được buffer tạm thời

### **Bảo mật:**
- **Privacy**: Chỉ stream khi cần thiết
- **API Key**: Bảo vệ API key trong production
- **Data**: Video/audio được gửi đến Google AI

## 🔍 Troubleshooting

### **"Không thể chia sẻ màn hình"**
- Kiểm tra quyền trình duyệt
- Thử refresh trang
- Sử dụng Chrome/Edge (hỗ trợ tốt nhất)

### **"Không có âm thanh hệ thống"**
- Chọn "Share system audio" khi chia sẻ màn hình
- Kiểm tra volume hệ thống
- Thử browser khác

### **"AI không trả lời về video"**
- Đảm bảo đang stream video
- Hỏi câu hỏi cụ thể hơn
- Kiểm tra kết nối mạng

### **"Lag/Delay cao"**
- Giảm chất lượng video
- Kiểm tra bandwidth
- Đóng các ứng dụng khác

## 🚀 Tính năng tương lai

- [ ] **Multiple video sources** (nhiều camera)
- [ ] **Video recording** (lưu video local)
- [ ] **Real-time annotations** (vẽ trên video)
- [ ] **Voice commands** (điều khiển bằng giọng nói)
- [ ] **Screen regions** (chỉ capture một phần màn hình)

## 📚 API Reference

### **WebSocket Messages:**

**Gửi Video:**
```javascript
{
  type: 'sendVideo',
  videoData: 'base64_string',
  mimeType: 'video/webm'
}
```

**Gửi Audio:**
```javascript
{
  type: 'sendAudio', 
  audioData: 'base64_string',
  mimeType: 'audio/webm'
}
```

**Gửi Text:**
```javascript
{
  type: 'sendText',
  text: 'Câu hỏi về video/audio'
}
```

---

🎉 **Chúc bạn khám phá thành công tính năng Multimodal với Gemini Live!**
