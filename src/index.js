require('dotenv').config();
const { Client, GatewayIntentBits, Events, REST, Routes, ActivityType, EmbedBuilder } = require('discord.js');
const { commands } = require('./commands');
const voiceManager = require('./voiceManager');
const ttsQueue = require('./ttsQueue');
const cloneManager = require('./cloneManager');
const emojiRegex = require('emoji-regex')(); // Sẽ bỏ qua phần này cho gọn, dùng replace thủ công

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_APP_ID;
const MAX_TEXT_LENGTH = 100;

if (!TOKEN || !CLIENT_ID) {
    console.error("Missing DISCORD_TOKEN or DISCORD_APP_ID in .env file");
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once(Events.ClientReady, async c => {
    let cloneStr = cloneManager.isClone ? ` (Clone ID: ${cloneManager.cloneId})` : '';
    console.log(`Bíp boop, bot gTTS đã sẵn sàng! Logged in as ${c.user.tag}${cloneStr}`);
    client.user.setActivity('/help | /join | /setup', { type: ActivityType.Playing });

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        console.log('Started refreshing global application (/) commands.');
        // Ghi đè toàn bộ command trên các máy chủ
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );
        console.log('Successfully reloaded global application (/) commands.');
    } catch (error) {
        console.error(error);
    }

    // Tự động start các clone nếu đây là Bot gốc lúc startup
    if (!cloneManager.isClone) {
        cloneManager.autoStartClones();
    }
});

// Xử lý auto-leave
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    voiceManager.handleVoiceStateUpdate(oldState, newState, client);
});

// Xử lý chat text -> voice
client.on(Events.MessageCreate, async message => {
    if (message.author.bot || !message.guild) return;

    const setupChannelId = voiceManager.getSetupChannel(message.guild.id);
    const connection = require('@discordjs/voice').getVoiceConnection(message.guild.id);

    // Nếu chưa setup kênh chat, hoặc bot không ở trong kênh thoại thì thôi
    if (message.channelId !== setupChannelId || !connection) return;

    // Làm sạch text
    let text = message.content;

    // Xóa link
    text = text.replace(/https?:\/\/[^\s]+/g, '');
    // Xóa thẻ tag @user
    text = text.replace(/<@!?\d+>/g, '');
    // Xóa custom emoji
    text = text.replace(/<:\w+:\d+>/g, '');

    const queueObj = ttsQueue.getQueue(message.guild.id);
    if (queueObj.skipEmoji) {
        // Biểu thức chính quy đơn giản xoá emoji
        text = text.replace(/[\u1000-\uFFFF]+/g, '');
    }

    text = text.trim();

    if (text.length > MAX_TEXT_LENGTH) {
        await message.channel.send(`⚠️ Xin lỗi, tao không rảnh đọc câu dài hơn ${MAX_TEXT_LENGTH} ký tự đâu.`);
        return;
    }

    if (text.length > 0) {
        ttsQueue.addTextLine(message.guild.id, text, message.channel, voiceManager, message.guild);
        try {
            await message.react('👀');
        } catch (e) { }
    }
});

// Xử lý slash command
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    const guildId = interaction.guild.id;

    if (commandName === 'setup') {
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        voiceManager.setSetupChannel(guildId, targetChannel.id);
        await interaction.reply({ content: `✅ Đã thiết lập kênh lắng nghe gTTS tại: ${targetChannel}` });
    }

    else if (commandName === 'voice') {
        const choice = interaction.options.getString('speaker');
        ttsQueue.setSpeaker(guildId, choice);
        await interaction.reply({ content: `✅ Đã đổi ngôn ngữ kết quả Google TTS thành: **${choice}**` });
    }

    else if (commandName === 'join') {
        // Tự động setup nếu chưa có
        let autoSetupMsg = '';
        if (voiceManager.getSetupChannel(guildId) !== interaction.channelId) {
            voiceManager.setSetupChannel(guildId, interaction.channel.id);
            autoSetupMsg = `✅ Tự động chuyển kênh nghe TTS hiện tại sang: ${interaction.channel}\n`;
        }

        const res = await voiceManager.joinChannel(interaction);
        if (res) {
            await interaction.reply({ content: `${autoSetupMsg}👋 Đã tham gia **${res.voiceChannel.name}**. Hãy chat vào kênh này để bot đọc!` });
        }
    }

    else if (commandName === 'leave') {
        await voiceManager.leaveChannel(interaction);
    }

    else if (commandName === 'skip') {
        const skipped = voiceManager.skip(interaction);
        if (skipped) {
            await interaction.reply({ content: '⏭️ Đã bỏ qua câu đang đọc.' });
        } else {
            await interaction.reply({ content: 'Không có câu gì đang đọc cả.', ephemeral: true });
        }
    }

    else if (commandName === 'skip_emoji') {
        const queueObj = ttsQueue.getQueue(guildId);
        ttsQueue.setSkipEmoji(guildId, !queueObj.skipEmoji);

        const statusStr = !queueObj.skipEmoji ? "**BẬT** (Bot sẽ bỏ qua không đọc emoji)" : "**TẮT** (Bot sẽ cố gắng đọc emoji)";
        await interaction.reply({ content: `✅ Đã ${statusStr} chế độ bỏ qua Unicode Emoji.` });
    }

    else if (commandName === 'status') {
        const ch = voiceManager.getSetupChannel(guildId);
        const chStr = ch ? `<#${ch}>` : '_(chưa thiết lập)_';
        const conn = require('@discordjs/voice').getVoiceConnection(guildId);

        const vcStr = conn ? '_(đang trong kênh thoại)_' : '_(chưa vào kênh)_';

        const queueObj = ttsQueue.getQueue(guildId);
        const queueSize = queueObj.items.length;

        const embed = new EmbedBuilder()
            .setTitle('📊 Trạng thái Bot gTTS')
            .setColor(0x5865F2)
            .addFields(
                { name: '📝 Kênh lắng nghe (Text)', value: chStr, inline: true },
                { name: '🎙️ Tình trạng Voice', value: vcStr, inline: true },
                { name: '💬 Hàng đợi', value: `\`${queueSize}\` câu`, inline: true },
                { name: '🤖 Ngôn ngữ (Voice)', value: queueObj.speaker, inline: true },
                { name: '🚫 Bỏ qua Emoji', value: queueObj.skipEmoji ? 'Bật' : 'Tắt', inline: true }
            );

        await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('📖 Danh sách lệnh Bot gTTS')
            .setDescription('Bot đọc văn bản thành giọng nói dùng thư viện Google Translate cực nhẹ.\nDùng lệnh `/voice` để đổi ngôn ngữ (Tiếng Anh, Việt, Hàn...).')
            .setColor(0x57F287)
            .addFields(
                { name: '⚙️ Thiết lập (Admin)', value: '`/setup [kênh]` — Chọn kênh văn bản để bot lắng nghe 🔒\n`/status` — Xem trạng thái bot 🔒', inline: false },
                { name: '🔊 Điều khiển (Mọi người)', value: '`/join` — Bot vào kênh thoại bạn đang đứng\n`/leave` — Bot rời kênh thoại, xóa hàng đợi\n`/skip` — Bỏ qua câu đang đọc\n`/skip_emoji` — Bật/tắt bỏ đọc Emoji\n`/voice` — Đổi ngôn ngữ TTS\n`/ping` — Xem ping', inline: false },
                { name: '💬 Cách dùng TTS', value: `Sau khi \`/join\`, chỉ cần **gõ text** vào kênh đã setup là bot tự đọc.\nGiới hạn tối đa **${MAX_TEXT_LENGTH} ký tự** mỗi tin nhắn.`, inline: false }
            )
            .setFooter({ text: 'Bot TTS Siêu Nhẹ (gTTS + Node.js)' });

        await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'ping') {
        await interaction.reply(`🏓 Pong! \`${client.ws.ping}ms\``);
    }

    // CÁC LỆNH QUẢN LÝ CLONE
    else if (commandName === 'clone') {
        if (cloneManager.isClone) {
            return await interaction.reply({ content: '❌ Clone không được phép sinh thêm clone!', ephemeral: true });
        }

        const botToken = interaction.options.getString('token');
        const appId = interaction.options.getString('app_id');

        let clones = cloneManager.loadClones();
        const cloneId = `clone_${Date.now()}`;

        const newClone = { id: cloneId, token: botToken, app_id: appId };
        clones.push(newClone);

        cloneManager.saveClones(clones); // Lưu DB
        cloneManager.startClone(newClone); // Chạy process ẩn

        await interaction.reply({ content: `🎉 Đã khởi chạy thành công 1 mầm Bot (ID: \`${cloneId}\`). Bot con này sẽ mất khoảng vài giây để Online.\nĐể bot con này vào chung server, bạn cần truy cập Discord Developer Portal -> Invite URL (Bot quyền Admin) của cái Application ID vừa nhập.` });
    }

    else if (commandName === 'clones') {
        if (cloneManager.isClone) {
            return await interaction.reply({ content: 'Tớ chỉ là một cái bóng clone bé nhỏ thôi!', ephemeral: true });
        }

        const clones = cloneManager.loadClones();
        if (clones.length === 0) {
            return await interaction.reply({ content: '📊 Không có bot clone nào đang lưu trữ.', ephemeral: true });
        }

        let msg = `Có **${clones.length}** bot clone trong hệ thống:\n`;
        clones.forEach((c, index) => {
            const status = cloneManager.processes.has(c.id) ? '🟢 Đang chạy' : '🔴 Ngủ đông';
            msg += `${index + 1}. \`${c.id}\` - Tình trạng: ${status}\n`;
        });
        await interaction.reply({ content: msg, ephemeral: true });
    }

    else if (commandName === 'unclone') {
        if (cloneManager.isClone) {
            return await interaction.reply({ content: 'Lỗi quyền hạn (Clone).', ephemeral: true });
        }

        const targetId = interaction.options.getString('clone_id');
        let clones = cloneManager.loadClones();

        const cloneIndex = clones.findIndex(c => c.id === targetId);

        if (cloneIndex === -1) {
            return await interaction.reply({ content: `❌ Không tìm thấy clone nào có ID: \`${targetId}\`. Dùng lệnh \`/clones\` để tra cứu.`, ephemeral: true });
        }

        // Xóa process
        cloneManager.stopClone(targetId);
        // Ngắt database
        clones.splice(cloneIndex, 1);
        cloneManager.saveClones(clones);

        await interaction.reply({ content: `🗑️ Đã tiêu diệt và xóa hoàn toàn clone \`${targetId}\` khỏi bộ nhớ.` });
    }
});

// Bỏ qua lỗi promise unhandled thay vì crash server
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

client.login(TOKEN);

// Lắng nghe sự kiện shutdown để tắt sạch clone
process.on('SIGINT', () => {
    console.log('\n[Ngắt hệ thống] Bot chính đang tắt, thực thi dọn dẹp...');
    cloneManager.stopAllClones();
    process.exit(0);
});

process.on('SIGTERM', () => {
    cloneManager.stopAllClones();
    process.exit(0);
});
