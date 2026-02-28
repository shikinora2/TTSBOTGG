const fs = require('fs');
const path = require('path');
const { fork } = require('child_process');

const CLONES_FILE = path.join(__dirname, '..', 'clones.json');

class CloneManager {
    constructor() {
        this.processes = new Map(); // Luu tru cac subprocess
        // Khi cloneManager được khởi tạo trên tiến trình clone, isClone = true
        this.isClone = process.env.IS_CLONE === 'true';
        this.cloneId = process.env.CLONE_ID || null;
    }

    loadClones() {
        if (fs.existsSync(CLONES_FILE)) {
            try {
                const data = fs.readFileSync(CLONES_FILE, 'utf8');
                return JSON.parse(data).clones || [];
            } catch (e) {
                return [];
            }
        }
        return [];
    }

    saveClones(clones) {
        fs.writeFileSync(CLONES_FILE, JSON.stringify({ clones }, null, 2), 'utf8');
    }

    startClone(cloneInfo) {
        if (this.isClone) return; // Clone không được phép tạo thêm clone

        const { id, token, app_id } = cloneInfo;
        const scriptPath = path.join(__dirname, 'index.js'); // Chạy lại file gốc nhưng truyền param khác

        // Dùng fork thay vì exec để tận dụng IPC và tách biệt memory
        const child = fork(scriptPath, [], {
            env: {
                ...process.env,
                DISCORD_TOKEN: token,
                DISCORD_APP_ID: app_id,
                IS_CLONE: 'true',
                CLONE_ID: id
            }
        });

        child.on('error', (err) => {
            console.error(`[Clone ${id}] Failed to start:`, err);
        });

        child.on('exit', (code) => {
            console.log(`[Clone ${id}] Exited with code ${code}`);
            this.processes.delete(id);
        });

        this.processes.set(id, child);
        console.log(`[Clone ${id}] Đã khởi chạy (PID: ${child.pid})`);
        return child;
    }

    stopClone(cloneId) {
        if (this.processes.has(cloneId)) {
            const child = this.processes.get(cloneId);
            child.kill('SIGTERM'); // Cố gắng đóng gọn gàng
            this.processes.delete(cloneId);
            console.log(`[CloneManager] Đã ngắt clone ${cloneId}`);
            return true;
        }
        return false;
    }

    autoStartClones() {
        if (this.isClone) return;

        const clones = this.loadClones();
        console.log(`[CloneManager] Dò thấy ${clones.length} bots phụ từ DB. Bắt đầu tự động bật...`);
        for (const clone of clones) {
            this.startClone(clone);
        }
    }

    stopAllClones() {
        if (this.isClone) return;

        for (const [id, child] of this.processes.entries()) {
            child.kill();
            console.log(`[CloneManager] Auto-kill clone ${id} vì Bot chính đóng cửa.`);
        }
        this.processes.clear();
    }
}

module.exports = new CloneManager();
