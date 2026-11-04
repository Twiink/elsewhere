import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const TARGET_DIR = './public/textures/contact';
const BACKUP_DIR = './public/textures/contact/backups';

async function upgrade(file, nextPOTWidth, nextPOTHeight) {
    console.log(`将 ${file} 提升至 ${nextPOTWidth}×${nextPOTHeight} 以提高画质……`);
    const backupPath = path.join(BACKUP_DIR, file);
    const targetPath = path.join(TARGET_DIR, file);

    if (!fs.existsSync(backupPath)) {
        console.error(`未找到 ${file} 的备份，无法安全提升画质。`);
        return;
    }

    try {
        const inputBuffer = fs.readFileSync(backupPath);
        await sharp(inputBuffer)
            .resize(nextPOTWidth, nextPOTHeight, { fit: 'fill' })
            .webp({ quality: 100, lossless: true })
            .toFile(targetPath);
        console.log(`成功： ${file} 画质已提升。`);
    } catch (e) {
        console.error(`提升画质失败： ${file}: ${e.message}`);
    }
}

async function run() {
    // 木桶：原图约 2K，提升至 2048×2048。
    await upgrade('beczka.webp', 2048, 2048);
    await upgrade('beczka_painted.webp', 2048, 2048);
    await upgrade('beczka.png', 2048, 2048);
    await upgrade('beczka_painted.png', 2048, 2048);

    // 船：原图 2525×978，提升至 4096×1024。
    await upgrade('statek.webp', 4096, 1024);
}

run();
