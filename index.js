const mongoose = require('mongoose');
const express = require('express');
const app = express();
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI;

// DB 연결 함수 (연결 재사용)
let cachedDb = null;
async function connectToDatabase() {
    if (cachedDb) return;
    cachedDb = await mongoose.connect(MONGO_URI);
}

const UserSchema = new mongoose.Schema({
    userId: Number,
    ip: String,
    hwid: String,
    isBanned: { type: Boolean, default: false },
    reason: String
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

app.post('/api/check', async (req, res) => {
    try {
        await connectToDatabase();
        const { userId, hwid } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        const banData = await User.findOne({
            isBanned: true,
            $or: [{ ip: ip }, { hwid: hwid }]
        });

        if (banData) {
            return res.json({ allowed: false, reason: banData.reason });
        }

        await User.findOneAndUpdate({ userId }, { ip, hwid }, { upsert: true });
        res.json({ allowed: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = app;