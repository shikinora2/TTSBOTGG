#!/bin/bash
echo "=========================================================="
echo "   🚀 Bắt đầu cài đặt Discord TTS Bot (Node.js gTTS)   "
echo "=========================================================="

# 1. Cập nhật hệ thống
echo "🔄 Cập nhật hệ thống Ubuntu..."
sudo apt update && sudo apt upgrade -y

# 2. Cài đặt các gói cần thiết (curl, ffmpeg cho voice discord)
echo "📦 Cài đặt curl và FFmpeg (bắt buộc cho xử lý âm thanh)..."
sudo apt install -y curl ffmpeg

# 3. Cài đặt Node.js bản 20.x mới nhất
echo "🌐 Đang kéo Node.js v20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Kiểm tra version
node -v
npm -v

# 4. Cài đặt thư viện NPM
echo "📚 Cài đặt thư viện Node.js cho dự án (npm install)..."
npm install

# 5. Cấp quyền pm2 quản lý tác vụ ngầm
echo "⚙️ Thiết lập công cụ PM2 (Chạy nền tự động)..."
sudo npm install pm2 -g -y

# 6. Khởi chạy Bot lần đầu
echo "▶️ Đang khởi động Bot thông qua PM2..."
pm2 start src/index.js --name "ttsbot"

# 7. Cấu hình PM2 khởi động cùng VPS
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME

echo "=========================================================="
echo "   ✅ CÀI ĐẶT HOÀN TẤT!"
echo "   📝 Vui lòng nhập TOKEN Discord vào file .env bằng lệnh:"
echo "      nano .env"
echo ""
echo "   ♻️ Sau khi lưu file .env, khởi động lại bot bằng lệnh:"
echo "      pm2 restart ttsbot"
echo "=========================================================="
