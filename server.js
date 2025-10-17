const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Python后端API地址
const PYTHON_API_URL = 'http://localhost:5001';

// SEO分析API
app.post('/api/analyze', async (req, res) => {
    try {
        console.log('收到SEO分析请求:', req.body.url);
        
        // 转发请求到Python后端
        const response = await axios.post(`${PYTHON_API_URL}/api/analyze`, {
            url: req.body.url
        }, {
            timeout: 60000 // 60秒超时
        });
        
        console.log('Python后端响应:', response.data.totalScore);
        
        // 返回结果给前端
        res.json(response.data);
        
    } catch (error) {
        console.error('SEO分析错误:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            res.status(500).json({
                error: 'Python后端服务未启动，请先启动Python服务器'
            });
        } else if (error.response) {
            res.status(error.response.status).json({
                error: error.response.data.error || 'SEO分析失败'
            });
        } else {
            res.status(500).json({
                error: 'SEO分析服务暂时不可用'
            });
        }
    }
});

// 健康检查API
app.get('/api/health', async (req, res) => {
    try {
        // 检查Python后端状态
        const pythonHealth = await axios.get(`${PYTHON_API_URL}/api/health`);
        
        res.json({
            status: 'healthy',
            nodejs: 'running',
            python: pythonHealth.data.status,
            message: '所有服务运行正常'
        });
        
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            nodejs: 'running',
            python: 'unavailable',
            error: 'Python后端服务不可用'
        });
    }
});

// 获取支持的指标
app.get('/api/metrics', async (req, res) => {
    try {
        const response = await axios.get(`${PYTHON_API_URL}/api/metrics`);
        res.json(response.data);
    } catch (error) {
        console.error('获取指标失败:', error.message);
        res.status(500).json({ error: '无法获取SEO指标' });
    }
});

// 提供静态文件
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`Node.js中间层服务器运行在 http://localhost:${PORT}`);
    console.log(`Python后端API地址: ${PYTHON_API_URL}`);
    console.log('请确保Python后端服务已启动');
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭Node.js服务器...');
    process.exit(0);
});
