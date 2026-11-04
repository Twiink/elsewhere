import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const TARGET_DIR = './public/textures/clouds';
const BACKUP_DIR = './public/textures/clouds/backups';

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function getDownscalePowerOfTwo(n) {
  const pots = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
  let best = pots[0];
  for (let p of pots) {
    if (p <= n) best = p;
    else break;
  }
  return best;
}

async function optimize() {
  const files = fs.readdirSync(TARGET_DIR).filter(f => f.match(/\.(webp|jpg|jpeg|png)$/i));
  console.log(`正在以降采样策略优化云目录中的非二次幂纹理……`);

  for (const file of files) {
    const fullPath = path.join(TARGET_DIR, file);
    const backupPath = path.join(BACKUP_DIR, file);

    try {
      const inputBuffer = fs.readFileSync(fullPath);
      const metadata = await sharp(inputBuffer).metadata();
      const { width, height } = metadata;

      const newWidth = getDownscalePowerOfTwo(width);
      const newHeight = getDownscalePowerOfTwo(height);

      if (newWidth !== width || newHeight !== height) {
        console.log(`降采样 ${file}: ${width}x${height} -> ${newWidth}x${newHeight}`);
        
        // 备份
        if (!fs.existsSync(backupPath)) {
          fs.copyFileSync(fullPath, backupPath);
        }

        const tmpPath = fullPath + '.tmp_cloud.webp';
        await sharp(inputBuffer)
          .resize(newWidth, newHeight, { fit: 'fill' }) // 采用填充缩放，在代码中修正比例。
          .webp({ quality: 85 })
          .toFile(tmpPath);
          
        fs.renameSync(tmpPath, fullPath);
        console.log(`成功： ${file}`);
      } else {
        console.log(`跳过 ${file}，已为二次幂尺寸： ${width}x${height}`);
      }
    } catch (e) {
      console.error(`处理出错： ${file}: ${e.message}`);
    }
  }
}

optimize().then(() => console.log('云纹理优化完成！'));
