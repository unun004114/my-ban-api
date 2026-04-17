const mongoose = require('mongoose');

// DB 연결 캐싱 (성능 최적화)
let cachedDb = null;
async function connectToDatabase() {
    if (cachedDb) return cachedDb;
    cachedDb = await mongoose.connect(process.env.MONGO_URI);
    return cachedDb;
}

const UserSchema = new mongoose.Schema({
    userId: Number,
    ip: String,
    hwid: String,
    isBanned: { type: Boolean, default: false },
    reason: String
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

// Vercel Serverless Function 핸들러
module.exports = async (req, res) => {
    // 주소 확인 (안전장치)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        await connectToDatabase();
        
        const { userId, hwid } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // 밴 여부 확인
        const banData = await User.findOne({
            isBanned: true,
            $or: [{ ip: ip }, { hwid: hwid }]
        });

        if (banData) {
            return res.status(200).json({ allowed: false, reason: banData.reason });
        }

        // 유저 정보 업데이트 (또는 신규 생성)
        await User.findOneAndUpdate({ userId }, { ip, hwid }, { upsert: true });
        
        return res.status(200).json({ allowed: true });

    } catch (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};