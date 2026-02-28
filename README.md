# 🤖 Discord gTTS Bot — Node.js Version

Bot Discord đọc tin nhắn bằng giọng nói (Text-to-Speech) tự động sử dụng **Google TTS**.
Phiên bản mới viết bằng **Node.js** cực kỳ nhẹ nhàng, siêu tốc, có thể chạy mượt mà trên VPS tài nguyên cực thấp (1 CPU / 512MB RAM) mà không bị giật lag. Hỗ trợ đa ngôn ngữ và tạo vô hạn các bot clone song song.

---

## ⚡ Cài đặt lên VPS Ubuntu (Chỉ bằng 1 lệnh)

Hãy mở terminal SSH vào VPS Ubuntu của bạn, copy dòng dưới đây rồi bấm Enter:

```bash
git clone https://github.com/shikinora2/TTSBOTGG.git /root/TTSBOTGG && cd /root/TTSBOTGG && sudo bash setup.sh
```

> ⏱ Mất chưa tới **2 phút**. Script lập trình sẵn sẽ tự động cài Node.js 20, thư viện FFmpeg, tải Dependencies và thiết lập siêu công cụ quản lý `pm2` để bot luôn tự bắt đầu chạy ngầm mỗi khi khởi động lại máy.

---

## ✅ Sau khi cài đặt xong

### 1. Tạo link mời bot (OAuth2)
Để mời bot vào server, bạn cần thao tác trên trang [Discord Developer Portal](https://discord.com/developers/applications):
1. Vào tab **OAuth2** → **URL Generator**
2. **Scopes**: Tích chọn `✅ bot` + `✅ applications.commands`
3. **Bot Permissions**: Tích chọn `✅ Send Messages` · `✅ Read Message History` · `✅ Add Reactions` · `✅ Connect` · `✅ Speak` · `✅ Use Voice Activity`
4. Copy đoạn URL ở dưới cùng → Dán vào trình duyệt → Chọn Server của bạn → **Authorize**.

### 2. Điền Discord Token
Bạn cần điền thông tin Token Discord để bot hoạt động:

```bash
nano /root/TTSBOTGG/.env
```

Điền Token và Application ID của Bot (lấy tại trang Discord Developer Portal):
```env
DISCORD_TOKEN=DÁN_TOKEN_CỦA_BẠN_VÀO_ĐÂY
DISCORD_APP_ID=DÁN_BOT_ID_CỦA_BẠN_VÀO_ĐÂY
```
*(Bấm `Ctrl+X` => `Y` => `Enter` để lưu lại file)*

### 3. Khởi động lại bot
Sử dụng công cụ `pm2` để yêu cầu bot làm mới dữ liệu và bắt đầu phục vụ:

```bash
pm2 restart TTSBOTGG
```

---

## 🎮 Danh sách lệnh Slash trên Discord

### 🔒 Lệnh Cài Đặt (chỉ admin server)

| Lệnh | Chức năng |
|---|---|
| `/setup [#kênh]` | Chọn một kênh text cố định để bot lắng nghe chữ và phát ra âm thanh |
| `/status` | Xem bảng trạng thái chi tiết của bot (Ngôn ngữ đang chọn, Hàng đợi...) |
| `/clone token:<TOKEN> app_id:<ID>` | Nhân bản bot (tạo thêm vô hạn bot con xài chung 1 process VPS) |
| `/unclone clone_id:<ID>` | Cho một bot con đi ngủ vĩnh viễn |
| `/clones` | Xem danh sách các mã máy bot con đang hoạt động |

### 🌐 Lệnh Voice Control (Mọi người)

| Lệnh | Chức năng |
|---|---|
| `/voice` | Chọn ngôn ngữ Google TTS (Hỗ trợ: Tiếng Việt, Anh, Nhật, Hàn, Trung) |
| `/join` | Gọi bot vào kênh thoại bạn đang có mặt |
| `/leave` | Đuổi bot ra khỏi kênh thoại |
| `/skip` | Bỏ qua câu đang đọc dở, chuyển sang câu tiếp theo liền mạch |
| `/skip_emoji` | (Bật/tắt) Tính năng lọc bỏ tự động các Emoji / Biểu tượng cảm xúc Unicode |
| `/ping` | Xem độ trễ tín hiệu từ máy chủ bot tới Discord |
| `/help` | Hiện bảng hướng dẫn |

---

## � Quản trị tiến trình ngầm (Bằng PM2)

Hệ thống Bot hiện tại không chiếm dụng cửa sổ Terminal của bạn. Nó sử dụng `PM2`. Bạn có thể dễ dàng quản lý thông qua các lệnh rút gọn này:

- **Xem log tương tác (cửa sổ theo dõi bot chat)**: `pm2 logs TTSBOTGG`
- **Tạm dừng bot hoạt động**: `pm2 stop TTSBOTGG`
- **Khởi động lại bot**: `pm2 restart TTSBOTGG`
- **Kiểm tra tình trạng bot (RAM/CPU đang tốn)**: `pm2 status TTSBOTGG`

> 💡 **Với tính năng Clone**: Dù bạn chạy 1 bot hay 10 bots con, chúng đều tự động khôi phục và hoạt động trơn tru sau mỗi lần máy chủ bảo trì khởi động lại, nhờ tập hợp lưu trữ Child Process `clones.json`!
