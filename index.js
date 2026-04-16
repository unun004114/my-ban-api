const express = require('express');
const mongoose = require('mongoose');
const app = express();
app.use(express.json());

// 비밀번호가 포함된 주석을 완전히 지웠습니다.
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ DB 연결 성공"))
    .catch((err) => console.error("❌ 연결 실패:", err));

const UserSchema = new mongoose.Schema({
    userId: Number,
    ip: String,
    hwid: String,
    isBanned: { type: Boolean, default: false },
    reason: String
});
const User = mongoose.model('User', UserSchema);

app.post('/check', async (req, res) => {
    const { userId, hwid } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    try {
        const banData = await User.findOne({
            isBanned: true,
            $or: [{ ip: ip }, { hwid: hwid }]
        });
        if (banData) return res.json({ allowed: false, reason: banData.reason });

        await User.findOneAndUpdate({ userId }, { ip, hwid }, { upsert: true });
        res.json({ allowed: true });
    } catch (err) { res.status(500).send("Error"); }
});

app.listen(3000, () => console.log("Server running"));