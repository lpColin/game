@echo off
chcp 65001 >nul
echo 🛑 正在停止炸金花服务器...
echo.

:: 查找并关闭占用3000端口的进程
echo 📍 查找端口 3000 占用...
set found=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
    echo 🔴 关闭进程 PID: %%a
    taskkill /F /PID %%a 2>nul
    set found=1
)

if %found%==0 (
    echo ℹ️ 端口 3000 未被占用
) else (
    echo ✅ 已关闭占用进程
)

echo.
echo 👋 服务器已停止！
pause
