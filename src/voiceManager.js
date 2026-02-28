const { joinVoiceChannel, createAudioPlayer, AudioPlayerStatus, getVoiceConnection, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const ttsQueue = require('./ttsQueue');

class VoiceManager {
    constructor() {
        this.connections = new Map();
        this.players = new Map();
        this.setupChannels = new Map();
        this.leaveTimers = new Map();
    }

    setSetupChannel(guildId, channelId) {
        this.setupChannels.set(guildId, channelId);
    }

    getSetupChannel(guildId) {
        return this.setupChannels.get(guildId);
    }

    async joinChannel(interaction) {
        const guildId = interaction.guild.id;
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            await interaction.reply({ content: '⚠️ Bạn phải vào một kênh thoại (Voice Channel) trước!', ephemeral: true });
            return false;
        }

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guildId,
            adapterCreator: interaction.guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false
        });

        const player = createAudioPlayer();
        connection.subscribe(player);

        this.connections.set(guildId, connection);
        this.players.set(guildId, player);

        // Xử lý sự kiện khi Player nghỉ (Phát xong 1 câu)
        player.on(AudioPlayerStatus.Idle, () => {
            const queueObj = ttsQueue.getQueue(guildId);
            queueObj.isPlaying = false;

            // Nếu hàng đợi còn thì đọc tiếp
            if (queueObj.items.length > 0) {
                ttsQueue.processQueue(guildId, this, null, interaction.guild);
            }
        });

        player.on('error', error => {
            console.error(`Audio Player Error: ${error.message} with resource`);
            const queueObj = ttsQueue.getQueue(guildId);
            queueObj.isPlaying = false;
            if (queueObj.items.length > 0) ttsQueue.processQueue(guildId, this, null, interaction.guild);
        });

        connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
                // Seems to be reconnecting to a new voice channel - ignore disconnect
                console.log(`[Voice] Tự động kết nối lại Voice Channel thành công.`);
            } catch (error) {
                // Seems to be a real disconnect which shouldn't be recovered from
                console.log(`[Voice] Voice Channel bị ngắt kết nối tĩnh (hoặc UDP timeout). Cố gắng phục hồi bằng cách join lại...`);

                // Thử reconnect thủ công (optional) nhưng để an toàn và clean thì báo ngắt trước.
                // Để phòng ngừa crash văng bot, ta destroy kết nối cũ.
                connection.destroy();
                this.connections.delete(guildId);
                this.players.delete(guildId);
            }
        });

        return { voiceChannel, connection };
    }

    async leaveChannel(interaction) {
        const guildId = interaction.guild.id;
        const connection = getVoiceConnection(guildId);

        if (connection) {
            ttsQueue.clearQueue(guildId);
            connection.destroy();
            this.connections.delete(guildId);
            this.players.delete(guildId);
            if (interaction) await interaction.reply('🛑 Đã rời kênh thoại và xóa hàng đợi.');
        } else if (interaction) {
            await interaction.reply({ content: 'Bot đang không ở trong kênh thoại nào.', ephemeral: true });
        }
    }

    // Auto-leave 10s logic
    handleVoiceStateUpdate(oldState, newState, client) {
        // Chỉ xử lý nếu bot đang trong kênh
        if (oldState.member.id === client.user.id) return;

        const guildId = newState.guild.id;
        const connection = getVoiceConnection(guildId);

        if (!connection) return;

        // channel của bot hiện tại
        const botChannelId = connection.joinConfig.channelId;
        const botChannel = client.channels.cache.get(botChannelId);

        if (!botChannel) return;

        // Có người vào kênh
        if (newState.channelId === botChannelId) {
            const timer = this.leaveTimers.get(guildId);
            if (timer) {
                clearTimeout(timer);
                this.leaveTimers.delete(guildId);
                console.log(`[Auto-Leave] Đã hủy hẹn giờ rời kênh ở server ${newState.guild.name}.`);
            }
        }
        // Có người rời kênh
        else if (oldState.channelId === botChannelId && newState.channelId !== botChannelId) {
            // Lọc ra số người thật (không tính bot)
            const humanCount = botChannel.members.filter(m => !m.user.bot).size;

            if (humanCount === 0) {
                console.log(`[Auto-Leave] Kênh ${botChannel.name} trống, đếm ngược 10s...`);

                const timer = setTimeout(() => {
                    const currentConnection = getVoiceConnection(guildId);
                    if (currentConnection) {
                        const currentBotChannel = client.channels.cache.get(currentConnection.joinConfig.channelId);
                        if (currentBotChannel && currentBotChannel.members.filter(m => !m.user.bot).size === 0) {
                            // Rút lui
                            ttsQueue.clearQueue(guildId);
                            currentConnection.destroy();
                            this.connections.delete(guildId);
                            this.players.delete(guildId);

                            // Nhắn tin tạm biệt
                            const setupChannelId = this.getSetupChannel(guildId);
                            if (setupChannelId) {
                                const setupChannel = client.channels.cache.get(setupChannelId);
                                if (setupChannel) setupChannel.send('👋 Mọi người đi hết rồi, bot cũng xin phép out kênh thoại đây! Trả lại sự tĩnh lặng...');
                            }
                            console.log(`[Auto-Leave] Đã tự động rời kênh ở server ${newState.guild.name}.`);
                        }
                    }
                    this.leaveTimers.delete(guildId);
                }, 10000);

                this.leaveTimers.set(guildId, timer);
            }
        }
    }

    async playResource(guildId, resource, guildObj) {
        const player = this.players.get(guildId);
        if (player) {
            console.log(`[VoicePlayer] Đang gọi lệnh player.play(resource)...`);
            player.play(resource);
        } else {
            console.log(`[VoicePlayer] 🔴 LỖI: Không tìm thấy player nào cho guildId ${guildId}`);
        }
    }

    skip(interaction) {
        const guildId = interaction.guild.id;
        const player = this.players.get(guildId);
        if (player && player.state.status !== AudioPlayerStatus.Idle) {
            player.stop(); // gọi stop() nó sẽ trigger event Idle, giúp nhảy câu tiếp theo
            return true;
        }
        return false;
    }
}

module.exports = new VoiceManager();
