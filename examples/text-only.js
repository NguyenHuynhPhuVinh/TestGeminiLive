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

const model = 'gemini-live-2.5-flash-preview';
const config = { responseModalities: [Modality.TEXT] };

async function textOnlyDemo() {
    console.log('💬 Demo Gửi và Nhận Tin Nhắn Văn Bản với Gemini Live');
    console.log('=======================================================');

    const responseQueue = [];

    // Helper function để chờ message
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

    // Helper function để xử lý một turn hoàn chỉnh
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

        const session = await ai.live.connect({
            model: model,
            callbacks: {
                onopen: function () {
                    console.log('✅ Kết nối thành công!');
                },
                onmessage: function (message) {
                    responseQueue.push(message);
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

        // Danh sách câu hỏi để test
        const questions = [
            'Hello how are you?',
            'Xin chào! Bạn có khỏe không?',
            'What is the capital of France?',
            'Thủ đô của Việt Nam là gì?',
            'Can you help me learn programming?',
            'Cảm ơn bạn!'
        ];

        // Gửi từng câu hỏi và nhận phản hồi
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            
            console.log(`\n📤 Câu hỏi ${i + 1}: "${question}"`);
            console.log('⏳ Đang gửi và chờ phản hồi...');

            // Gửi tin nhắn văn bản
            const inputTurns = question;
            session.sendClientContent({ turns: inputTurns });

            // Chờ và xử lý phản hồi
            const turns = await handleTurn();
            
            // Hiển thị phản hồi
            for (const turn of turns) {
                if (turn.text) {
                    console.log('💬 Gemini:', turn.text);
                } else if (turn.data) {
                    console.log('📨 Nhận được dữ liệu inline:', turn.data);
                }
            }

            // Chờ một chút giữa các câu hỏi
            if (i < questions.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log('\n🎉 Demo hoàn thành!');
        session.close();

    } catch (error) {
        console.error('❌ Lỗi khi chạy demo:', error.message);
        if (error.message.includes('API key')) {
            console.log('💡 Hãy kiểm tra lại API key trong file .env');
        }
    }
}

// Demo với context conversation (nhiều lượt hội thoại)
async function contextConversationDemo() {
    console.log('\n💬 Demo Hội Thoại Có Ngữ Cảnh');
    console.log('================================');

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
        const session = await ai.live.connect({
            model: model,
            callbacks: {
                onopen: () => console.log('✅ Kết nối thành công!'),
                onmessage: (message) => responseQueue.push(message),
                onerror: (e) => console.error('❌ Lỗi:', e.message),
                onclose: (e) => console.log('🔌 Đóng kết nối:', e.reason),
            },
            config: config,
        });

        // Thiết lập ngữ cảnh hội thoại
        console.log('📝 Thiết lập ngữ cảnh hội thoại...');
        
        let inputTurns = [
            { "role": "user", "parts": [{ "text": "What is the capital of France?" }] },
            { "role": "model", "parts": [{ "text": "Paris" }] },
        ];

        session.sendClientContent({ turns: inputTurns, turnComplete: false });

        // Tiếp tục hội thoại
        console.log('💬 Tiếp tục hội thoại...');
        
        inputTurns = [{ "role": "user", "parts": [{ "text": "What is the capital of Germany?" }] }];
        session.sendClientContent({ turns: inputTurns, turnComplete: true });

        const turns = await handleTurn();
        
        for (const turn of turns) {
            if (turn.text) {
                console.log('💬 Gemini:', turn.text);
            }
        }

        console.log('\n🎉 Demo ngữ cảnh hoàn thành!');
        session.close();

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    }
}

// Main function
async function main() {
    console.log('🚀 Bắt đầu Demo Text-Only với Gemini Live API\n');
    
    // Chạy demo cơ bản
    await textOnlyDemo();
    
    // Chờ một chút
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Chạy demo ngữ cảnh
    await contextConversationDemo();
}

// Chạy demo nếu file được chạy trực tiếp
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
