#!/bin/bash
# 远程部署脚本 - 在服务器上执行

set -e

echo "🎴 炸金花游戏部署开始..."

# 创建目录
mkdir -p /opt/zjh-game
cd /opt/zjh-game

# 创建 nginx.conf
cat > nginx.conf << 'EOF'
server {
    listen 80;
    server_name _;
    
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
EOF

echo "✅ nginx.conf 创建完成"

# 创建 docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  zjh-game:
    image: nginx:alpine
    container_name: zjh-game
    restart: always
    ports:
      - "80:80"
    volumes:
      - ./zjh-game.html:/usr/share/nginx/html/index.html:ro
      - ./game.js:/usr/share/nginx/html/game.js:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
EOF

echo "✅ docker-compose.yml 创建完成"

# 检查游戏文件是否存在
if [ ! -f "zjh-game.html" ]; then
    echo "⚠️ 警告: zjh-game.html 不存在，请上传此文件"
fi

if [ ! -f "game.js" ]; then
    echo "⚠️ 警告: game.js 不存在，请上传此文件"
fi

# 如果文件都存在，启动服务
if [ -f "zjh-game.html" ] && [ -f "game.js" ]; then
    echo "🚀 启动 Docker 服务..."
    docker-compose down 2>/dev/null || true
    docker-compose up -d
    
    sleep 2
    
    if docker ps | grep -q zjh-game; then
        echo ""
        echo "✅ 部署成功！"
        echo "🎮 访问地址: http://139.196.90.198"
        echo ""
        docker ps --filter "name=zjh-game" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    else
        echo "❌ 部署失败"
        docker logs zjh-game 2>&1 || true
    fi
else
    echo ""
    echo "📋 请上传以下文件到 /opt/zjh-game/:"
    echo "  - zjh-game.html"
    echo "  - game.js"
    echo ""
    echo "上传完成后，再次运行此脚本"
fi
