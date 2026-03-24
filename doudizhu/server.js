/**
 * 斗地主服务器
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3002;
const STATIC_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    let filePath = path.join(STATIC_DIR, req.url === '/' ? '/index.html' : req.url);
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'text/plain';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('404 Not Found');
            } else {
                res.writeHead(500);
                res.end('500 Internal Server Error');
            }
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
});

server.listen(PORT, () => {
    console.log(`🎴 斗地主服务器已启动！`);
    console.log(`📍 本地访问: http://localhost:${PORT}`);
    console.log(`🌐 局域网访问: http://192.168.1.17:${PORT}`);
    console.log(`\n按 Ctrl+C 停止服务器`);
});