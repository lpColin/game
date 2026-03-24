@echo off
chcp 65001 >nul
echo 🔄 正在重启炸金花服务器...
echo.

:: 查找并关闭占用3000端口的进程（只关闭该端口进程，不关闭所有node）
echo 📍 检查端口 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
    echo 🔴 关闭占用进程 PID: %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo 🚀 重新启动服务器...
start node server.js

echo ✅ 服务器已重启！
echo 📍 局域网地址: http://192.168.1.17:3000
echo 🌐 公网地址: http://139.196.90.198:8080
echo.
pause
