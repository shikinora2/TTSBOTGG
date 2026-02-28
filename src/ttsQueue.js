const { createAudioResource } = require('@discordjs/voice');
const googleTTS = require('google-tts-api');

class TTSQueueManager {
    constructor() {
        this.queues = new Map();
        // Mỗi server sẽ có 1 queue riêng
    }

    getQueue(guildId) {
        if (!this.queues.has(guildId)) {
            this.queues.set(guildId, {
                items: [],
                isPlaying: false,
                speaker: 'vi', // Mặc định tiếng Việt
                skipEmoji: false
            });
        }
        return this.queues.get(guildId);
    }

    async addTextLine(guildId, text, channelObj, voiceManager, guildObj) {
        const queue = this.getQueue(guildId);

        // Thêm vào hàng đợi
        queue.items.push(text);

        // Bắt đầu xử lý nều chưa
        if (!queue.isPlaying) {
            console.log(`[TTS] Queue đang rảnh, gọi processQueue ngay.`);
            this.processQueue(guildId, voiceManager, channelObj, guildObj);
        } else {
            console.log(`[TTS] Queue báo đang bận (isPlaying=true). Chờ lượt...`);

            // Đề phòng kẹt Queue, check xem player có nhàn rỗi không
            const player = voiceManager.players.get(guildId);
            if (player && player.state.status === require('@discordjs/voice').AudioPlayerStatus.Idle) {
                console.log(`[TTS Warning] Queue báo bận nhưng Player đang Idle! Ép buộc chạy tiếp.`);
                queue.isPlaying = false;
                this.processQueue(guildId, voiceManager, channelObj, guildObj);
            }
        }
    }

    async processQueue(guildId, voiceManager, textChannel, guildObj) {
        const queue = this.getQueue(guildId);

        if (queue.items.length === 0) {
            queue.isPlaying = false;
            return;
        }

        queue.isPlaying = true;
        const text = queue.items.shift();

        try {
            // Gọi gTTS lấy URL âm thanh
            const url = googleTTS.getAudioUrl(text, {
                lang: queue.speaker,
                slow: false,
                host: 'https://translate.google.com',
            });
            console.log(`[TTS] Đã tạo audio URL thành công: ${url}`);

            // Yêu cầu voiceManager phát cái url này
            const resource = createAudioResource(url);
            console.log(`[TTS] Đã tạo @discordjs/voice resource. Bắt đầu phát qua VoiceManager...`);

            await voiceManager.playResource(guildId, resource, guildObj);

            // Đợi phát xong thì đệ quy gọi tiếp (việc đợi được handle trong voiceManager qua event AudioPlayer status Idle)
        } catch (error) {
            console.error('[TTS Error]', error);
            // Có lỗi thì bỏ qua đọc câu tiếp theo
            this.processQueue(guildId, voiceManager, textChannel, guildObj);
        }
    }

    setSpeaker(guildId, speakerChoice) {
        const queue = this.getQueue(guildId);
        queue.speaker = speakerChoice;
    }

    setSkipEmoji(guildId, skip) {
        const queue = this.getQueue(guildId);
        queue.skipEmoji = skip;
    }

    clearQueue(guildId) {
        if (this.queues.has(guildId)) {
            this.queues.get(guildId).items = [];
            this.queues.get(guildId).isPlaying = false;
        }
    }
}

module.exports = new TTSQueueManager();
