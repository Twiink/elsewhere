import sharp from 'sharp';
import fs from 'fs';

async function test() {
  const file = 'public/textures/entrance/avatar_window.webp';
  const metadata = await sharp(file).metadata();
  console.log('原尺寸：', metadata.width, metadata.height);

  await sharp(file)
    .resize(1024, 1024, { fit: 'fill' })
    .toFile('public/textures/entrance/avatar_window_test.webp');
    
  const m2 = await sharp('public/textures/entrance/avatar_window_test.webp').metadata();
  console.log('新尺寸：', m2.width, m2.height);
}

test();
