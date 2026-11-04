import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = './public/textures/about/backups';
const TARGET_DIR = './public/textures/about';

const SOTD_FILES = [
  'SOTDAYYOUNGMULTICSSWINNER.webp',
  'SOTDAYYOUNGMULTIDESIGNNOMINESS.webp',
  'SOTDAYYOUNGMULTIGSAP.webp',
  'SOTDAYYOUNGMULTIORPETRON.webp'
];

async function fixAwardsToSquarePOT() {
  console.log('将每日最佳奖项纹理转为 512×512 二次幂正方形，供代码还原比例……');
  for (const file of SOTD_FILES) {
    const backupPath = path.join(BACKUP_DIR, file);
    const targetPath = path.join(TARGET_DIR, file);

    if (fs.existsSync(backupPath)) {
      console.log(`正在处理 ${file}……`);
      // 填充缩放至 512×512；先拉伸为正方形，再由代码还原比例。
      await sharp(backupPath)
        .resize(512, 512, {
          fit: 'fill'
        })
        .webp({ quality: 90 })
        .toFile(targetPath + '.tmp');
      
      fs.renameSync(targetPath + '.tmp', targetPath);
      console.log(`已将 ${file} 填充缩放为 512×512`);
    } else {
      console.error(`未找到 ${file} 的备份`);
    }
  }
  console.log('每日最佳奖项纹理修复完成！');
}

fixAwardsToSquarePOT();
