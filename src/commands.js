const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Thiết lập kênh text để bot lắng nghe và đọc tin nhắn')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Kênh văn bản muốn bot lắng nghe (bỏ trống = kênh hiện tại)')
                .setRequired(false)),
    new SlashCommandBuilder()
        .setName('voice')
        .setDescription('Chọn giọng đọc (ngôn ngữ gTTS)')
        .addStringOption(option =>
            option.setName('speaker')
                .setDescription('Chọn ngôn ngữ')
                .setRequired(true)
                .addChoices(
                    { name: '🇻🇳 Tiếng Việt (Mặc định)', value: 'vi' },
                    { name: '🇬🇧 Tiếng Anh', value: 'en' },
                    { name: '🇯🇵 Tiếng Nhật', value: 'ja' },
                    { name: '🇰🇷 Tiếng Hàn', value: 'ko' },
                    { name: '🇨🇳 Tiếng Trung', value: 'zh' }
                )),
    new SlashCommandBuilder()
        .setName('join')
        .setDescription('Gọi bot vào kênh thoại bạn đang đứng'),
    new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Bot rời kênh thoại và xóa hàng đợi'),
    new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Bỏ qua câu đang đọc hiện tại'),
    new SlashCommandBuilder()
        .setName('skip_emoji')
        .setDescription('Bật/Tắt chế độ bot bỏ qua emoji khi đọc'),
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('Xem trạng thái hiện tại của bot trong server này')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Kiểm tra độ trễ của bot'),
    new SlashCommandBuilder()
        .setName('clone')
        .setDescription('Nhân bản bot — tạo thêm 1 bot TTS độc lập (cần token bot mới)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('token').setDescription('Bot token mới').setRequired(true))
        .addStringOption(option =>
            option.setName('app_id').setDescription('Application ID của bot mới').setRequired(true)),
    new SlashCommandBuilder()
        .setName('unclone')
        .setDescription('Xóa 1 bot clone và dừng hoạt động')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('clone_id').setDescription('ID của clone cần xóa (vd: clone_1)').setRequired(true)),
    new SlashCommandBuilder()
        .setName('clones')
        .setDescription('Xem danh sách tất cả bot clone đang chạy')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Xem danh sách hướng dẫn các lệnh của bot')
];

module.exports = { commands };
