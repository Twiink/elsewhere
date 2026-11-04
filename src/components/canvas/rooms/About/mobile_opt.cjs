const fs = require('fs');

const FILE_PATH = 'c:/Users/tomsz/Desktop/portfolio/portfolio-itom/src/components/canvas/rooms/About/InfiniteSkyManager.jsx';
let content = fs.readFileSync(FILE_PATH, 'utf8');

// 1. 修正 AwardButton。
content = content.replace(
    /const AwardButton = \(\{ onClick, texture, paintedTexture, width, height, position, onHoverChange \}\) => \{/,
    `const AwardButton = ({ onClick, texture, paintedTexture, width, height, position, onHoverChange }) => {
    const { viewport } = useThree();
    const isMobile = viewport.width < 8;`
);

content = content.replace(
    /const handlePointerOver = \(\) => \{/g,
    `const handlePointerOver = () => {
        if (isMobile) return;`
);

content = content.replace(
    /const handlePointerOut = \(\) => \{/g,
    `const handlePointerOut = () => {
        if (isMobile) return;`
);


// 2. 修正 AwardsMilestone。
content = content.replace(
    /const \{ camera \} = useThree\(\);/g,
    `const { camera, viewport } = useThree();
    const isMobile = viewport.width < 8;`
);

content = content.replace(
    /const sotyPaintedTexture = useLoader\(THREE\.TextureLoader, '\/textures\/about\/SOTY_painted\.webp'\);\s*const sotdPaintedTexture = useLoader\(THREE\.TextureLoader, '\/textures\/about\/SOTD_painted\.webp'\);\s*const sotmPaintedTexture = useLoader\(THREE\.TextureLoader, '\/textures\/about\/SOTM_painted\.webp'\);\s*const buttonTexture = useLoader\(THREE\.TextureLoader, '\/textures\/about\/PRZYCISKSOTD\.webp'\);\s*const buttonPaintedTexture = useLoader\(THREE\.TextureLoader, '\/textures\/about\/PRZYCISKSOTD_painted\.webp'\);/g,
    `const sotyPaintedTexture = useLoader(THREE.TextureLoader, isMobile ? '/textures/about/SOTY.webp' : '/textures/about/SOTY_painted.webp');
    const sotdPaintedTexture = useLoader(THREE.TextureLoader, isMobile ? '/textures/about/SOTD.webp' : '/textures/about/SOTD_painted.webp');
    const sotmPaintedTexture = useLoader(THREE.TextureLoader, isMobile ? '/textures/about/SOTM.webp' : '/textures/about/SOTM_painted.webp');
    const buttonTexture = useLoader(THREE.TextureLoader, '/textures/about/PRZYCISKSOTD.webp');
    const buttonPaintedTexture = useLoader(THREE.TextureLoader, isMobile ? '/textures/about/PRZYCISKSOTD.webp' : '/textures/about/PRZYCISKSOTD_painted.webp');`
);

content = content.replace(
    /const makeCardHoverHandler = \(revealRef, paintedRef, hideDelayRef\) => \(isHovered\) => \{/,
    `const makeCardHoverHandler = (revealRef, paintedRef, hideDelayRef) => (isHovered) => {
        if (isMobile) return;`
);


// 3. 修正 SkillBalloon。
// 注意：SkillBalloon 已根据视口定义 isMobile。
// 替换 SkillBalloon 中的纹理加载逻辑。
content = content.replace(
    /const texture = useLoader\(THREE\.TextureLoader, config\.texture\);\s*const paintedTexture = useLoader\(THREE\.TextureLoader, config\.paintedTexture\);/g,
    `const isMobileViewport = viewport.width < 8; // 在状态定义前提供用于纹理加载的局部常量
    const texture = useLoader(THREE.TextureLoader, config.texture);
    const paintedTextureUrl = isMobileViewport ? config.texture : config.paintedTexture;
    const paintedTexture = useLoader(THREE.TextureLoader, paintedTextureUrl);`
);

content = content.replace(
    /const handlePointerOver = \(e\) => \{/g,
    `const handlePointerOver = (e) => {
        if (isMobile) return;`
);

content = content.replace(
    /const handlePointerOut = \(e\) => \{/g,
    `const handlePointerOut = (e) => {
        if (isMobile) return;`
);


// isMobile 在 Hook 后才定义，因此在此前使用 isMobileViewport，并改写对应逻辑。
fs.writeFileSync(FILE_PATH, content, 'utf8');
console.log('修改已成功应用。');
