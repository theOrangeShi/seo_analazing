#!/bin/bash

echo "🚀 启动SEO分析系统..."

# 检查conda是否激活
if [ -z "$CONDA_DEFAULT_ENV" ]; then
    echo "❌ 请先激活conda环境（当前未在conda环境中）"
    exit 1
fi

echo "✅ 当前conda环境: $CONDA_DEFAULT_ENV"

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装Node.js"
    exit 1
fi

# 安装Python依赖
echo "📦 安装Python依赖到当前环境..."
cd backend
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "❌ Python依赖安装失败"
    exit 1
fi
cd ..

echo "📦 安装Node.js依赖..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Node.js依赖安装失败"
    exit 1
fi

# 查找可用端口
find_available_port() {
    local port=$1
    while lsof -i :$port > /dev/null 2>&1; do
        port=$((port + 1))
    done
    echo $port
}

PYTHON_PORT=5001
NODE_PORT=$(find_available_port 3000)

echo "🐍 启动Python后端服务器 (端口: $PYTHON_PORT)..."
cd backend
python app.py &
PYTHON_PID=$!
cd ..

# 等待Python服务器启动
sleep 3

echo "🟢 启动Node.js中间层服务器 (端口: $NODE_PORT)..."

# 修改server.js中的端口
sed -i.bak "s/const PORT = [0-9]*;/const PORT = $NODE_PORT;/" server.js

node server.js &
NODE_PID=$!

echo "✅ 系统启动完成！"
echo ""
echo "🌐 访问地址: http://localhost:$NODE_PORT"
echo "🐍 Python API: http://localhost:$PYTHON_PORT"
echo "🟢 Node.js API: http://localhost:$NODE_PORT/api"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap "echo ''; echo '🛑 正在停止服务...'; kill $PYTHON_PID $NODE_PID 2>/dev/null; mv server.js.bak server.js 2>/dev/null; exit 0" INT
wait