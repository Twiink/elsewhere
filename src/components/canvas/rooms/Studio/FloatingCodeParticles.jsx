import { usePerformance } from '../../../../context/contexts';
import Text from '../../SiteText';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';

import * as THREE from 'three';


// ============================================
// 配置。
// ============================================
const PARTICLE_COUNT = 36;
const MIN_RADIUS = 4;
const MAX_RADIUS = 12;
const VERTICAL_SPREAD = 25;
const BASE_OPACITY = 0.18;

// 无缝循环阈值。
const LOOP_BOTTOM = -15;
const LOOP_TOP = 15;
const LOOP_HEIGHT = LOOP_TOP - LOOP_BOTTOM;

// 手记里的生活片段，作为淡淡的手写背景。
const SYMBOLS = [
    { text: '出门走走', size: 0.35, weight: 2 },
    { text: '日出', size: 0.45, weight: 3 },
    { text: '合照', size: 0.4, weight: 3 },
    { text: '再玩一局', size: 0.35, weight: 2 },
    { text: '已存档', size: 0.4, weight: 3 },
    { text: '随手画', size: 0.4, weight: 2 },
    { text: '小发现', size: 0.35, weight: 2 },
];

// 按权重随机选择。
const getRandomSymbol = () => {
    const totalWeight = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;

    for (const symbol of SYMBOLS) {
        random -= symbol.weight;
        if (random <= 0) return symbol;
    }
    return SYMBOLS[0];
};

// 一次性生成粒子数据。
// 一次性生成粒子数据。
const generateParticles = (count) => {
    const particles = [];

    // 二维平面边界。
    const X_SPREAD = 50; // 与 useFrame 中的 WRAP_WIDTH 一致。
    const Z_MIN = -4; // 位于显示器后方，显示器半径约 ±2.2。
    const Z_MAX = -8; // 更靠后。

    for (let i = 0; i < count; i++) {
        const symbol = getRandomSymbol();

        // 在扁平交互空间内生成随机三维位置。
        const x = (Math.random() - 0.5) * X_SPREAD;
        const y = (Math.random() - 0.5) * VERTICAL_SPREAD;
        const z = Z_MIN + Math.random() * (Z_MAX - Z_MIN);

        particles.push({
            id: i,
            symbol,
            position: new THREE.Vector3(x, y, z), // 初始位置。
            initialX: x, // 保存供逻辑使用。
            z: z,        // 保存供逻辑使用。
            initialY: y,
            rotation: Math.random() * Math.PI * 2,
            driftSpeed: 0.1 + Math.random() * 0.2,
            rotationSpeed: (Math.random() - 0.5) * 0.3,
            parallaxFactor: 0.3 + Math.random() * 0.7,
            phaseOffset: Math.random() * Math.PI * 2,
            opacity: BASE_OPACITY * (0.5 + Math.random() * 0.5),
        });
    }

    return particles;
};

// 主组件接收父级 ref，以实现平滑动画。
// fallOffsetRef 现表示速度 fallSpeed，而非累计偏移。
const FloatingCodeParticles = ({ towerRotationRef, fallOffsetRef }) => {
    const { settings } = usePerformance();
    const count = Math.round(PARTICLE_COUNT * settings.particleCount);
    const particles = useMemo(() => generateParticles(count), [count]);
    const meshRefs = useRef([]);

    // 跟踪插值后的数值以平滑运动。
    const smoothRotation = useRef(0);

    // 跟踪各粒子的累计 Y 偏移，永不重置。
    const particleYOffsets = useRef(particles.map(() => 0));

    // 所有粒子共用一个 useFrame。
    useFrame((state, delta) => {
        const time = state.clock.elapsedTime;

        // 从父级读取速度。
        const towerRotation = towerRotationRef?.current || 0;
        const fallVelocity = fallOffsetRef?.current || 0;

        // 平滑旋转。
        smoothRotation.current = THREE.MathUtils.lerp(smoothRotation.current, towerRotation, 0.08);

        // X 循环边界需足够宽，以覆盖屏幕。
        const WRAP_WIDTH = 50; // 循环前的总宽度。
        const HALF_WIDTH = WRAP_WIDTH / 2;

        particles.forEach((particle, index) => {
            const mesh = meshRefs.current[index];
            if (!mesh) return;

            // 竖向移动，逻辑保持不变。
            // 根据速度累加 Y 偏移。
            particleYOffsets.current[index] -= fallVelocity * delta * particle.parallaxFactor * 1.5;

            // 轻微漂浮动作。
            const floatY = Math.sin(time * particle.driftSpeed + particle.phaseOffset) * 0.3;

            // 计算最终 Y 位置。
            let finalY = particle.initialY + particleYOffsets.current[index] + floatY;

            // 开始竖向循环。
            while (finalY < LOOP_BOTTOM) {
                particleYOffsets.current[index] += LOOP_HEIGHT;
                finalY += LOOP_HEIGHT;
            }
            while (finalY > LOOP_TOP) {
                particleYOffsets.current[index] -= LOOP_HEIGHT;
                finalY -= LOOP_HEIGHT;
            }
            mesh.position.y = finalY;

            // 水平移动，新的二维逻辑。

            // 将水平位置与塔的旋转关联。
            // 旋转量乘以系数，转换为直线位移。
            // 向左旋转对应向左飞行，正负号取决于设置。
            // 将旋转量乘以标量。
            // 要实现左转时向左飞，需要核对符号。
            // 塔向左转通常对应 +Y 或 -Y 旋转。
            // 若塔绕 +Y 向左转，则希望粒子向 -X 左移。
            // 向左飞对应负 X 速度。
            // 使用标准视差系数。

            const rotationOffset = smoothRotation.current * 5.0; // 5.0 为旋转量到像素位移的传动比。

            // 按初始位置加旋转偏移，计算原始 X。
            // 减去 rotationOffset 可让粒子反向移动，形成深度感。
            // 需求：塔向左转时，粒子也向左飞。
            // 塔逆时针左转，通常为正 Y 旋转时，
            // 可见面向左移动。
            // 因此需核对 towerRotation 增加时，x 是否应减小。
            // 先尝试 initialX + rotationOffset，正旋转会使 X 增大并右移。
            // 视觉上可能表现为左转时向右飞。
            // 先假定正相关：右转对应右移。

            let finalX = particle.initialX + (rotationOffset * particle.parallaxFactor);

            // 手动取模，将位置循环到 -HALF_WIDTH 至 +HALF_WIDTH。
            // ((x + half) % width + width) % width - half
            finalX = ((finalX + HALF_WIDTH) % WRAP_WIDTH + WRAP_WIDTH) % WRAP_WIDTH - HALF_WIDTH;

            mesh.position.x = finalX;

            // 深度：固定平面。
            mesh.position.z = particle.z; // 固定在显示器后方的平面。

            // 保持原有的轻微自转。
            mesh.rotation.z = particle.rotation + time * particle.rotationSpeed;
        });
    });

    return (
        <group position={[0, 0, -10]}>
            {particles.map((particle, index) => (
                <Text
                    key={particle.id}
                    ref={(el) => { meshRefs.current[index] = el; }}
                    position={particle.position}
                    fontSize={particle.symbol.size}
                    color="#1a1a1a"
                    anchorX="center"
                    anchorY="middle"
                    fillOpacity={particle.opacity}
                    font="/media/fonts/LXGWWenKaiLite-site.woff"
                >
                    {particle.symbol.text}
                </Text>
            ))}
        </group>
    );
};

export default FloatingCodeParticles;
