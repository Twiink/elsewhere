import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import opentype from 'three/examples/jsm/libs/opentype.module.js';

const content = JSON.parse(await readFile(new URL('../src/data/content.json', import.meta.url), 'utf8'));
const fontBytes = await readFile(new URL('../public/fonts/LXGWWenKaiLite-Regular.ttf', import.meta.url));
const font = opentype.parse(fontBytes.buffer.slice(fontBytes.byteOffset, fontBytes.byteOffset + fontBytes.byteLength));
const escapeXml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const lettering = (text, x, y, size, color = '#292824') => `<path fill="${color}" d="${font.getPath(text, x, y, size).toPathData(2)}"/>`;
const assetPath = value => new URL(value, 'https://media.secknow-ai.com').pathname.replace(/^\/space(?=\/)/, '');
const localAssetUrl = value => new URL(`../public${assetPath(value)}`, import.meta.url);

// 对象存储地址映射到本地归档；封面内嵌插画缩略图与文楷字形路径。
const placements = [
    { x: 73, y: 179, size: 300, angle: -3, label: '长白山' },
    { x: 422, y: 215, size: 220, angle: 4, label: '雪山' },
    { x: 700, y: 180, size: 220, angle: -4, label: '滑雪' },
];
const keepsakes = await Promise.all(content.wishes.map(async (wish, index) => {
    const { x, y, size, angle, label } = placements[index];
    const image = await sharp(localAssetUrl(wish.image).pathname)
        .resize(512, 512, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    return `<g transform="rotate(${angle} ${x + size / 2} ${y + size / 2})">
<rect x="${x - 9}" y="${y - 9}" width="${size + 18}" height="${size + 51}" fill="#faf9f6" stroke="#c9c6bd" stroke-width="1.5"/>
<image x="${x}" y="${y}" width="${size}" height="${size}" xlink:href="data:image/jpeg;base64,${image.toString('base64')}"/>
<path d="M${x + 22} ${y - 18}h66v20h-66Z" fill="#b8b8b1" opacity=".7" transform="rotate(-7 ${x + 55} ${y - 8})"/>
${lettering(label, x + 10, y + size + 30, 29)}
</g>`;
}));

for (const [variant, texture] of [['ink', content.studioWishCard.frontTexture], ['color', content.studioWishCard.paintedFrontTexture]]) {
    const provenance = escapeXml(JSON.stringify({
        kind: 'native-svg-interface-cover',
        builder: 'scripts/build-studio-wish-covers.mjs',
        sourceImages: content.wishes.map(wish => `public${assetPath(wish.image)}`),
        sourcePrompts: 'assets/studio/wish-journal/illustrations.json',
        font: 'public/fonts/LXGWWenKaiLite-Regular.ttf',
        variant,
    }));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1024" height="640" viewBox="0 0 1024 640">
<title>想做的事</title>
<desc>长白山、雪山和滑雪的旅行心愿手账封面</desc>
<metadata>${provenance}</metadata>
<defs><filter id="ink" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/></filter></defs>
<rect x="3" y="3" width="1018" height="634" rx="18" fill="#fafafa" stroke="#292824" stroke-width="5"/>
<rect x="10" y="10" width="1004" height="620" rx="13" fill="none" stroke="#292824" stroke-width="2"/>
<path d="M28 25H996V561H28Z" fill="#fafafa" stroke="#292824" stroke-width="3"/>
<g${variant === 'ink' ? ' filter="url(#ink)"' : ''}>
${lettering(content.studioWishCard.title, 65, 108, 65)}
${lettering(content.studioWishCard.description, 69, 149, 29, '#55534d')}
${keepsakes.join('\n')}
</g>
${lettering('Twiink', 458, 617, 34)}
<circle cx="981" cy="608" r="11" fill="none" stroke="#292824" stroke-width="3"/>
</svg>\n`;
    await writeFile(localAssetUrl(texture), svg);
    console.log(`已生成 ${localAssetUrl(texture).pathname}`);
}
