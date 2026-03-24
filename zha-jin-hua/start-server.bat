@echo off
chcp 65001 >nul
echo 🎮 正在启动炸金花服务器...
echo.

:: 查找并关闭占用3000端口的进程（只关闭该端口进程）
echo 📍 检查端口 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
    echo 🔴 发现占用进程 PID: %%a，正在关闭...
    taskkill /F /PID %%a 2>nul
    timeout /t 1 /nobreak >nul
)

timeout /t 2 /nobreak >nul

echo.
echo 🚀 启动服务器...
node server.js

echo.
echo 📍 局域网地址: http://192.168.1.17:3000
echo 🌐 公网地址: http://139.196.90.198:8080
echo.
pause
