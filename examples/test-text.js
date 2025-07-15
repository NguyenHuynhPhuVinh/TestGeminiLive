import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Kiểm tra API key
if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_api_key_here') {
    console.error('❌ Vui lòng cập nhật GEMINI_API_KEY trong file .env');
    console.log('📝 Bạn có thể lấy API key tại: https://aistudio.google.com/app/apikey');
    process.exit(1);
}

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-preview-native-audio-dialog";

async function testTextResponse() {
    console.log('💬 Test Gemini Live với Text Response');
    console.log('=====================================');
    
    const responseQueue = [];

    async function waitMessage() {
        let done = false;
        let message = undefined;
        while (!done) {
            message = responseQueue.shift();
            if (message) {
                done = true;
            } else {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }
        return message;
    }

    async function handleTurn() {
        const turns = [];
        let done = false;
        while (!done) {
            const message = await waitMessage();
            turns.push(message);
            if (message.serverContent && message.serverContent.turnComplete) {
                done = true;
            }
        }
        return turns;
    }

    try {
        console.log('🔗 Đang kết nối với Gemini Live API...');
        
        const config = {
            responseModalities: [Modality.TEXT, Modality.AUDIO],
            systemInstruction: "Bạn là một trợ lý AI thông minh. Hãy trả lời ngắn gọn và thân thiện bằng tiếng Việt."
        };

        const session = await ai.live.connect({
            model: model,
            callbacks: {
                onopen: function () {
                    console.log('✅ Kết nối thành công!');
                },
                onmessage: function (message) {
                    responseQueue.push(message);
                    
                    // Hiển thị text response ngay lập tức
                    if (message.serverContent?.modelTurn?.parts) {
                        const textParts = message.serverContent.modelTurn.parts
                            .filter(part => part.text)
                            .map(part => part.text);
                        if (textParts.length > 0) {
                            console.log('💬 Gemini:', textParts.join(' '));
                        }
                    }
                    
                    if (message.data) {
                        console.log('🎵 Nhận được dữ liệu âm thanh');
                    }
                },
                onerror: function (e) {
                    console.error('❌ Lỗi:', e.message);
                },
                onclose: function (e) {
                    console.log('🔌 Đóng kết nối:', e.reason);
                },
            },
            config: config,
        });

        // Test với một số câu hỏi
        const questions = [
            "Xin chào! Bạn có khỏe không?",
            "Hôm nay là thứ mấy?",
            "Bạn có thể giúp tôi học tiếng Anh không?",
            "Cảm ơn bạn!"
        ];

        for (let i = 0; i < questions.length; i++) {
            console.log(`\n📤 Gửi câu hỏi ${i + 1}: "${questions[i]}"`);
            
            session.sendRealtimeInput({
                text: questions[i]
            });

            console.log('⏳ Đang chờ phản hồi...');
            await handleTurn();
            
            // Chờ một chút giữa các câu hỏi
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        session.close();
        console.log('\n🎉 Test hoàn thành!');

    } catch (error) {
        console.error('❌ Lỗi khi test:', error.message);
        if (error.message.includes('API key')) {
            console.log('💡 Hãy kiểm tra lại API key trong file .env');
        }
    }
}

// Chạy test
if (import.meta.url === `file://${process.argv[1]}`) {
    testTextResponse().catch(console.error);
}
