# SEO分析系统 - 真实数据爬取版

这是一个完整的SEO分析系统，包含Python后端、Node.js中间层和前端界面，能够真正爬取网站数据并进行SEO分析。

## 🏗️ 系统架构

```
前端 (HTML/CSS/JS) 
    ↓ HTTP请求
Node.js中间层 (Express)
    ↓ API调用
Python后端 (Flask + BeautifulSoup)
    ↓ 网站爬取
目标网站
```

## 📁 项目结构

```
SEO analyzing2/
├── backend/                 # Python后端
│   ├── seo_analyzer.py     # SEO分析核心逻辑
│   ├── app.py              # Flask API服务器
│   └── requirements.txt    # Python依赖
├── server.js               # Node.js中间层
├── package.json            # Node.js依赖和脚本
├── start.sh               # 一键启动脚本
├── index.html             # 前端页面
├── styles.css             # 样式文件
├── script.js              # 前端JavaScript
└── README.md              # 说明文档
```

## 🚀 快速开始

### 方法1: 使用一键启动脚本（推荐）

```bash
# 给脚本执行权限
chmod +x start.sh

# 启动系统
./start.sh
```

### 方法2: 手动启动

#### 1. 安装Python依赖
```bash
cd backend
pip3 install -r requirements.txt
```

#### 2. 安装Node.js依赖
```bash
npm install
```

#### 3. 启动Python后端
```bash
cd backend
python3 app.py
```

#### 4. 启动Node.js中间层（新终端）
```bash
node server.js
```

#### 5. 访问网站
打开浏览器访问: http://localhost:3003

## 🔧 系统要求

- **Python 3.7+**
- **Node.js 14+**
- **pip3**
- **npm**

## 📊 SEO分析指标

系统会分析以下12个SEO指标：

1. **页面速度** (权重: 15%)
   - 页面加载时间
   - 页面大小
   - 图片大小
   - CSS/JS文件大小

2. **移动优化** (权重: 12%)
   - Viewport meta标签
   - 触摸目标大小
   - 字体大小
   - 移动菜单

3. **Meta标签** (权重: 10%)
   - 标题长度和内容
   - 描述长度和内容
   - 关键词标签
   - Canonical标签

4. **标题结构** (权重: 8%)
   - H1标签数量和内容
   - H2/H3标签结构
   - 标题层级

5. **图片优化** (权重: 8%)
   - Alt属性完整性
   - 图片格式（WebP）
   - 图片大小

6. **内部链接** (权重: 10%)
   - 链接总数
   - 断链检测
   - 外部链接列表
   - 链接结构

7. **SSL证书** (权重: 12%)
   - HTTPS状态
   - 证书有效期
   - HSTS配置

8. **社交媒体标签** (权重: 6%)
   - Open Graph标签
   - Twitter Cards
   - 社交媒体图片

9. **内容质量** (权重: 10%)
   - 内容长度
   - 关键词密度
   - 可读性评分

10. **URL结构** (权重: 5%)
    - URL长度
    - URL层级
    - 关键词包含

11. **Robots.txt** (权重: 2%)
    - 文件存在性
    - 配置正确性

12. **Sitemap** (权重: 2%)
    - XML sitemap存在
    - 页面数量
    - 更新频率

## 🔌 API接口

### 分析网站
```http
POST /api/analyze
Content-Type: application/json

{
  "url": "https://example.com"
}
```

### 健康检查
```http
GET /api/health
```

### 获取指标列表
```http
GET /api/metrics
```

## 🐍 Python后端特性

- **真实网站爬取**: 使用requests和BeautifulSoup
- **SSL证书检查**: 检查HTTPS和证书有效期
- **图片分析**: 检查alt属性和格式
- **链接检测**: 检测断链和外部链接
- **内容分析**: 分析文本内容和结构
- **robots.txt检查**: 验证爬虫规则
- **sitemap分析**: 检查XML sitemap

## 🟢 Node.js中间层特性

- **跨域支持**: 使用CORS处理跨域请求
- **错误处理**: 统一的错误处理和响应
- **超时控制**: 60秒请求超时
- **健康检查**: 监控Python后端状态
- **静态文件服务**: 提供前端文件

## 🎨 前端特性

- **实时分析**: 调用真实API获取数据
- **响应式设计**: 支持移动端和桌面端
- **详细报告**: 显示具体爬取数据
- **改进建议**: 提供SEO优化建议
- **总分计算**: 基于权重的综合评分

## 🔍 使用示例

1. 打开 http://localhost:3003
2. 输入要分析的网站URL（如：example.com）
3. 点击"分析网站"按钮
4. 等待分析完成（通常需要10-30秒）
5. 查看详细的SEO分析报告

## ⚠️ 注意事项

1. **网络延迟**: 真实爬取需要时间，请耐心等待
2. **网站限制**: 某些网站可能有反爬虫机制
3. **SSL证书**: 需要网络连接来检查证书
4. **资源消耗**: 爬取大网站可能消耗较多资源

## 🛠️ 故障排除

### Python后端无法启动
```bash
# 检查Python版本
python3 --version

# 重新安装依赖
cd backend
pip3 install -r requirements.txt --force-reinstall
```

### Node.js中间层无法启动
```bash
# 检查Node.js版本
node --version

# 重新安装依赖
npm install --force
```

### 分析失败
- 检查目标网站是否可访问
- 确认网络连接正常
- 查看浏览器控制台错误信息

## 📈 性能优化

- 使用CDN加速静态资源
- 启用浏览器缓存
- 优化图片大小和格式
- 压缩CSS和JavaScript文件

## 🔒 安全考虑

- 输入验证和过滤
- 防止XSS攻击
- 限制请求频率
- 错误信息脱敏

## 📝 更新日志

### v1.0.0
- 实现真实的SEO分析功能
- 添加Python后端和Node.js中间层
- 支持12个SEO指标分析
- 提供详细的改进建议

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 📄 许可证

MIT License