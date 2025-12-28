// ==========================================
// AI Club 核心服务器 v5.0 - 终极权限架构版
// (支持：终极管理员、数据严格隔离、动态权限)
// ==========================================
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('./'));

// --- 图片存储配置 ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- 数据库连接 ---
mongoose.connect('mongodb://localhost:27017/ai_club_db')
    .then(() => console.log('✅ MongoDB 数据库连接成功！'))
    .catch(err => console.error('❌ 数据库连接失败！', err));

// --- 3. 定义全能用户模型 ---
const userSchema = new mongoose.Schema({
    // role 取值: 'ultimate_admin'(终极), 'super_admin'(超级), 'club_admin'(分校), 'member'(会员)
    role: { type: String, default: 'member' }, 
    password: { type: String },

    clubLocation: { type: String, required: true }, // 所属俱乐部
    childName: { type: String, required: true },
    childIDCard: { type: String, required: true, unique: true, trim: true },
    gender: { type: String },
    school: { type: String },
    gradeClass: { type: String },
    
    parentPhone: { type: String, required: true, trim: true }, 
    parentWeChat: { type: String },
    childPhoto: { type: String },
    
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// --- 4. 路由接口 ---

// 📝 注册/报名接口
app.post('/api/join', upload.single('childPhoto'), async (req, res) => {
    try {
        const formData = req.body;
        if (req.file) formData.childPhoto = req.file.path;

        // 默认密码逻辑：手机号后4位
        let initialPwd = '1234';
        if (formData.parentPhone && formData.parentPhone.length >= 4) {
            initialPwd = formData.parentPhone.slice(-4);
        }
        formData.password = initialPwd;
        formData.role = 'member'; // 默认都是普通会员

        const newUser = new User(formData);
        await newUser.save();
        res.status(201).json({ success: true, message: '报名成功！' });

    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ success: false, message: '该身份证号已存在！' });
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 🔐 登录接口 (分发权限令牌)
app.post('/api/login', async (req, res) => {
    const { phone, password } = req.body;

    // ★★★ 预设：终极管理员 (上帝账号) ★★★
    // 您可以用这个账号登录，拥有最高权限
    if (phone === 'boss' && password === 'boss888') {
        return res.json({ 
            success: true, 
            role: 'ultimate_admin', 
            name: '👑 终极管理员', 
            clubLocation: 'all', // 全局视野
            token: 'god_mode_token' 
        });
    }

    // ★★★ 预设：松湖俱乐部管理员 (测试用) ★★★
    if (phone === 'songhu' && password === '123456') {
        return res.json({ 
            success: true, 
            role: 'club_admin', 
            name: '松湖管理员', 
            clubLocation: '莞-松湖俱乐部', // 视野被限制在这里
            token: 'club_admin_token' 
        });
    }

    // 普通用户查库登录
    try {
        const user = await User.findOne({ parentPhone: phone });
        if (!user) return res.status(401).json({ success: false, message: '账号不存在' });
        if (user.password !== password) return res.status(401).json({ success: false, message: '密码错误' });

        res.json({
            success: true,
            role: user.role,
            clubLocation: user.clubLocation,
            name: user.childName,
            token: 'user_token_' + user._id
        });
    } catch (error) {
        res.status(500).json({ success: false, message: '登录错误' });
    }
});

// 📊 获取数据接口 (核心：数据隔离逻辑)
// 前端必须传 role (我是谁) 和 myClub (我在哪)
app.post('/api/check', async (req, res) => {
    const { role, myClub } = req.body; // 从前端传来的身份信息

    try {
        let query = {}; // 默认查询条件

        if (role === 'ultimate_admin' || role === 'super_admin') {
            // 1. 如果是终极/超级管理员：查询条件为空 = 查所有数据
            query = {}; 
        } else if (role === 'club_admin') {
            // 2. 如果是俱乐部管理员：强制加上查询条件，只查自己俱乐部的
            // 即使他在前端想看别的，后端也会卡死这里
            query = { clubLocation: myClub }; 
        } else {
            // 3. 其他人无权查看列表
            return res.status(403).json({ count: 0, data: [] });
        }

        // 排除掉终极管理员自己，不显示在列表里
        const users = await User.find(query).sort({ createdAt: -1 });
        res.json({ count: users.length, data: users });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🗑️ 删除接口 (只有终极管理员能删)
app.post('/api/delete', async (req, res) => {
    const { id, role } = req.body;
    
    // 只有终极管理员有权删除
    if (role !== 'ultimate_admin') {
        return res.status(403).json({ success: false, message: '权限不足！只有终极管理员可删除。' });
    }

    try {
        await User.findByIdAndDelete(id);
        res.json({ success: true, message: '删除成功' });
    } catch (error) {
        res.status(500).json({ success: false, message: '删除失败' });
    }
});

// 🔁 批量转会 (管理员与以上)
app.post('/api/transfer', async (req, res) => {
    const { ids, targetClub, role, myClub } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success:false, message:'缺少待转会员列表' });
    if (!targetClub) return res.status(400).json({ success:false, message:'缺少目标俱乐部' });
    try {
        let filter = { _id: { $in: ids } };
        if (role === 'club_admin') {
            filter.clubLocation = myClub; // 店长只能操作自己俱乐部的会员
        } else if (role === 'member') {
            return res.status(403).json({ success:false, message:'权限不足' });
        }
        const result = await User.updateMany(filter, { $set: { clubLocation: targetClub } });
        res.json({ success:true, updated: result.modifiedCount });
    } catch (e) {
        res.status(500).json({ success:false, message:e.message });
    }
});

app.listen(PORT, () => console.log(`🚀 AI CLUB 终极版启动！端口: ${PORT}`));
