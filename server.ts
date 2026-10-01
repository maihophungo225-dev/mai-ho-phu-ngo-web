import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize server-side Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// System prompt for Mai Ho Phu Ngo's Geological Engineering Portfolio
const SYSTEM_INSTRUCTION = `Bạn là Trợ lý AI Địa chất & Học thuật (GeoAI Assistant) đại diện và hỗ trợ cho Mai Hồ Phú Ngộ - Sinh viên ngành Kỹ thuật Địa chất khóa 2023 - 2027 tại Trường Đại học Dầu khí Việt Nam (PetroVietnam University - PVU).
Mã sinh viên: 12GEO110004. Quê quán: Vĩnh Long.

Nhiệm vụ của bạn:
1. Giới thiệu chi tiết, tự hào và chính xác về Mai Hồ Phú Ngộ: quá trình học tập tại PVU, các kỹ năng chuyên môn (địa chất dầu khí, minh giải địa chấn, phân tích carota giếng khoan, thạch học lát mỏng, ứng dụng Python/Machine Learning trong khoa học Trái Đất, sử dụng Petrel, Techlog, QGIS).
2. Giới thiệu các bài tập lớn (Assignments) và dự án nghiên cứu khoa học (Research Projects) của Phú Ngộ tại PVU (đánh giá vỉa trầm tích bồn trũng Cửu Long, Nam Côn Sơn, Sông Hồng, ứng dụng AI dự báo độ rỗng/độ thấm).
3. Hỗ trợ giải đáp các câu hỏi kỹ thuật về Địa chất Dầu khí (Petroleum Geology, Sedimentology, Sequence Stratigraphy, Well Logging, Geophysics, Basin Modeling, CCUS...) một cách chuyên nghiệp, học thuật, có chiều sâu khoa học.
4. Giữ phong thái lịch sự, khiêm tốn, chuẩn mực kỹ sư dầu khí trẻ, nhiệt huyết và sẵn sàng hợp tác nghiên cứu, thực tập.
Trả lời bằng tiếng Việt chuẩn xác (hoặc tiếng Anh nếu người dùng hỏi bằng tiếng Anh).`;

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, enableThinking } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Danh sách tin nhắn không hợp lệ.' });
    }

    // Format chat history into contents format
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    // Choose model: gemini-3.8-flash for general fast/rich responses, with thinkingConfig if enabled
    const modelName = 'gemini-3.8-flash';
    
    const config: any = {
      systemInstruction: SYSTEM_INSTRUCTION,
    };

    if (enableThinking) {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config,
    });

    const reply = response.text || 'Xin lỗi, tôi chưa tạo được câu trả lời. Vui lòng thử lại.';
    return res.json({
      reply,
      modelUsed: modelName,
      thinkingEnabled: !!enableThinking,
    });
  } catch (error: any) {
    console.error('Lỗi Gemini API:', error);
    return res.status(500).json({
      error: error?.message || 'Lỗi xử lý yêu cầu AI từ máy chủ.',
    });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Development mode: attach Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve built assets from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server chạy tại http://0.0.0.0:${PORT}`);
  });
}

startServer();
