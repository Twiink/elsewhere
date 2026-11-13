import { useTexture } from '../../../hooks/useMediaTexture';
import { useActiveFrame as useFrame } from '../../../hooks/useActiveFrame';
import { useMemo, useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

import { useTextureCopy } from '../../../hooks/useTextureCopy';

// 导入常量，以匹配 CorridorSegment 的逻辑。
// 实际项目中可将这些常量放入共享配置。
// 此处暂时复制数值，避免循环依赖或复杂导入。
const WALL_X_OUTER = 3.5;
const WALL_X_INNER = 1.7;
// 注意：DOOR_Z_SPAN = 4，来自 CorridorSegment。

/**
 * DoorWallSegment：向相机倾斜的动态墙段。
 * 用于门旁的倾斜墙面。
 */
const DoorWallSegment = ({ position, baseRotationY, width, corridorHeight, wallTexture, side }) => {
    const meshRef = useRef();
    const { camera } = useThree();

    // 倾斜状态。
    const currentTilt = useRef(0);

    // 倾斜参数，可调节效果。
    const BASE_TILT = 0.02;   // 基础倾角约 1°。
    const MAX_TILT = 0.20;    // 相机靠近时最大倾角约 12°。
    const TILT_START = 12;    // 相机距离 12 单位时开始倾斜。
    const TILT_PEAK = 2;      // 距离 2 单位时达到最大倾角。

    useFrame(() => {
        if (!meshRef.current) return;

        const distance = Math.abs(camera.position.z - position[2]);
        let targetTilt = BASE_TILT;

        if (distance < TILT_START && distance > TILT_PEAK) {
            // 靠近时逐渐增加倾角。
            const t = (TILT_START - distance) / (TILT_START - TILT_PEAK);
            const easedT = t * (2 - t); // 二次缓出。
            targetTilt = BASE_TILT + (MAX_TILT - BASE_TILT) * easedT;
        } else if (distance <= TILT_PEAK) {
            // 非常接近时保持最大倾角。
            targetTilt = MAX_TILT;
        }

        // 平滑插值。
        currentTilt.current = THREE.MathUtils.lerp(currentTilt.current, targetTilt, 0.06);

        // 按所在侧面决定倾斜方向。
        const tiltDirection = side === 'left' ? -1 : 1;
        meshRef.current.rotation.y = baseRotationY + (currentTilt.current * tiltDirection);
    });

    // 克隆纹理，以便独立设置重复次数。
    const segTexture = useTextureCopy(wallTexture, { repeatX: width / 2, repeatY: corridorHeight / 2 });

    return (
        <mesh ref={meshRef} position={position}>
            <planeGeometry args={[width, corridorHeight]} />
            <meshBasicMaterial color="#e0e0e0" map={segTexture} roughness={1} metalness={0} />
        </mesh>
    );
};


const FillerWall = ({ seg, wallTexture, baseboardTexture, corridorHeight }) => {
    const segTexture = useTextureCopy(wallTexture, {
        wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
        repeatX: seg.width / 2, repeatY: corridorHeight / 2,
    });
    const bbTexture = useTextureCopy(baseboardTexture, {
        wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
        colorSpace: THREE.SRGBColorSpace, repeatX: seg.width / ((1582 / 94) * 0.15),
    });
    // =============================================
    // 裁切门旁踢脚线。
    // =============================================
    // 与门相邻的两端分别缩短 0.5，
    // 由 trimStart 和 trimEnd 控制。
    // 移动踢脚线中心，使其与墙面保持对齐。
    // trimHighZ：裁切较大 Z 一端，即门凹槽起点。
    // trimLowZ：裁切较小 Z 一端，即门凹槽终点。
    const bbMarginHighZ = seg.trimHighZ ? 0.5 : 0;
    const bbMarginLowZ = seg.trimLowZ ? 0.5 : 0;
    const bbWidth = seg.width - bbMarginHighZ - bbMarginLowZ;

    // 沿局部坐标轴移动踢脚线中心，在组内为 X 轴。
    // 墙段经过旋转，局部 X 轴沿墙延伸。
    // 左墙旋转 +PI/2 后，局部 +X 指向世界 -Z（较小 Z）。
    // 右墙旋转 -PI/2 后，局部 +X 指向世界 +Z（较大 Z）。
    // 因此左右墙面的偏移方向相反。
    let bbOffsetX;
    if (seg.isLeft) {
        // 局部 +X = 世界 -Z = lowZ 一侧。
        bbOffsetX = (bbMarginLowZ - bbMarginHighZ) / 2;
    } else {
        // 局部 +X = 世界 +Z = highZ 一侧。
        bbOffsetX = (bbMarginHighZ - bbMarginLowZ) / 2;
    }

    return (
        <group position={seg.position} rotation={seg.rotation || [0, seg.rotationY, 0]}>
            {/* 主墙段。 */}
            <mesh>
                <planeGeometry args={[seg.width, corridorHeight]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={segTexture}
                    roughness={1}
                    metalness={0}
                />
            </mesh>

            {/* 踢脚线，门边已裁切。 */}
            <mesh position={[bbOffsetX, -corridorHeight / 2 + 0.075, 0.01]}>
                <planeGeometry args={[bbWidth, 0.15]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={bbTexture}
                    roughness={0.8}
                    side={THREE.DoubleSide}
                />
            </mesh>
        </group>
    );

};

/**
 * CorridorWalls 走廊墙面组件。
 * 
 * 渲染地板、天花板和锯齿形墙面。
 * 
 * @param {Array} doorPositions - 包含 { relativeZ, side, ... } 的门对象数组。
 * @param {number} zClip - 可选 Z 裁切值，隐藏 Z > zClip 的几何体。
 */
const CorridorWalls = ({ zStart = 10, length = 80, doorPositions = [], zClip = 100000 }) => {
    const corridorHeight = 3.5;

    // =============================================
    // 地面设置。
    // =============================================
    // 地面片段纹理：手绘木板。
    const [floorTexture, baseboardTexture, wallTexture, ceilingSource] = useTexture([
        '/media/images/textures/corridor/kawalekpodlogi.webp',
        '/media/images/textures/corridor/texturadoprogow.webp',
        '/media/images/textures/corridor/wall_texture.webp',
        '/media/images/textures/corridor/ceiling_texture.webp',
    ]);
    const ceilingTexture = useTextureCopy(ceilingSource, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, repeatX: 7 / 2, repeatY: 10 / 2 });
    // 从中间纹理的两侧边缘镜像延展，让木纹在条带交界处连续。
    const leftSideTexture = useTextureCopy(floorTexture, { wrapT: THREE.MirroredRepeatWrapping, repeatY: 1 / 5, offsetY: 1 });
    const rightSideTexture = useTextureCopy(floorTexture, { wrapT: THREE.MirroredRepeatWrapping, repeatY: 1 / 5, offsetY: -1 / 5 });

    // 按裁切条件计算有效几何体。
    // 只渲染 Math.min(zStart, zClip) 至 zStart - length 之间的区域。
    const effectiveStart = Math.min(zStart, zClip);
    const effectiveLength = effectiveStart - (zStart - length);

    // =============================================
    // 调整门边踢脚线的裁切。
    // =============================================
    // 设置门框两侧踢脚线各缩短多少个 3D 单位。
    // 数值越大，踢脚线与门之间的间隙越宽。
    // 数值越小，踢脚线越靠近门，可能覆盖门框。

    // 为指定侧面（'left' 或 'right'）生成墙段的辅助函数。
    const generateWallSegments = useCallback((side) => {
        const segments = [];
        const isLeft = side === 'left';
        const baseX = isLeft ? -WALL_X_OUTER : WALL_X_OUTER;
        const innerX = isLeft ? -WALL_X_INNER : WALL_X_INNER;

        // 从起点（较大 Z）向终点（较小 Z）构建墙面。
        // 当前 Z 游标。
        let currentZ = effectiveStart;
        const endZ = effectiveStart - effectiveLength;

        // 必要时按 relativeZ 降序排列门，靠近起点的排在前面。
        // relativeZ 为负数，如 -18、-32；-18 > -32。
        const sideDoors = doorPositions
            .filter(d => d.side === side)
            .sort((a, b) => b.relativeZ - a.relativeZ);

        sideDoors.forEach(door => {
            const doorZ = zStart + door.relativeZ; // 使用原始 zStart，保持世界坐标正确。
            const doorStartZ = doorZ + 2.0; // 倾斜墙段起点。
            const doorEndZ = doorZ - 2.0;   // 倾斜墙段终点。

            // 跳过完全被裁切的门，其起点已在身后。
            if (doorStartZ > currentZ) return;
            // 也跳过完全位于前方范围外的门。
            if (doorEndZ < endZ) return;

            // 1. 直线填充墙段：从 currentZ 至 doorStartZ。
            if (currentZ > doorStartZ) {
                const segLength = currentZ - doorStartZ;
                const segCenterZ = currentZ - segLength / 2;
                segments.push({
                    type: 'filler',
                    position: [baseX, 0, segCenterZ],
                    rotation: [0, isLeft ? Math.PI / 2 : -Math.PI / 2, 0],
                    width: segLength,
                    isLeft,
                    // 该段在门的较小 Z 一侧结束。
                    trimLowZ: true
                });
            }

            // 2. 外凸连接面：朝向相机的墙。
            // 当前位于外侧 baseX，接下来衔接倾斜墙面。
            // 倾斜墙面从外侧向内侧延伸。
            // 所以起点位于外侧是正确的。
            // 填充段位于外侧凹入处。
            // 因此这里已经是倾斜墙面的起点。
            // 门前无需额外连接面。
            // 以左墙（-X）为例：
            // 填充段位于 x=-3.5。
            // 倾斜墙面起点位于 x=-3.5。
            // 倾斜墙面终点位于 x=-1.7。
            // 两者连续相接。

            // 3. 倾斜墙面：承载门。
            // 从 (baseX, doorStartZ) 延伸至 (innerX, doorEndZ)。
            const dx = innerX - baseX;
            const dz = doorEndZ - doorStartZ; // 负值（-4）。
            const dist = Math.sqrt(dx * dx + dz * dz);
            // atan2(dx, dz)：左侧 dx=1.8、dz=-4，角度约 155°。
            // 标准墙面法线为 90°。
            // 需要绕 Y 轴旋转。
            // 分段中心：
            const midX = (baseX + innerX) / 2;
            const midZ = (doorStartZ + doorEndZ) / 2;

            // 旋转：
            // planeGeometry 默认位于 XY 平面，朝向 +Z。
            // 使用 lookAt 较为直接。
            // 墙面法线应指向内部。
            // 更简单的做法：定位几何体中心后旋转。
            // 起点至终点的向量为 (dx, 0, dz)。
            // Y 轴旋转角 = -atan2(dz, dx)。
            // 左侧 dx=1.8、dz=-4，atan2(-4, 1.8) 约为 -1.14 弧度，即 -65°。
            // -(-65°)=65°。
            // 核对：0° 沿 +X，90° 沿 -Z。
            // 65° 主要指向 +X，略偏 -Z。
            // 与该向量方向一致。
            // 法线相对于此方向再转 90°。
            // 左侧 dx=1.8、dz=-4，atan2 为 -1.14 弧度，取反为 +1.14。
            // 法线 (+0.9, +0.4) 指向右后方，符合左墙方向。
            // 右侧 dx=-1.8、dz=-4，atan2 为 -1.9 弧度（-110°），取反为 +1.9。
            // 核对法线 (+0.3, -0.9) 的计算。
            // 右墙法线需要指向 (-X, +Z)。
            // 加上 PI，修正背面朝向问题。

            const baseRotation = -Math.atan2(dz, dx);
            const finalRotation = isLeft ? baseRotation : baseRotation + Math.PI;

            segments.push({
                type: 'door',
                position: [midX, 0, midZ],
                rotationY: finalRotation,
                width: dist,
                side: side  // 用于决定动态倾斜方向。
            });

            // 4. 回退连接面：隐藏面。
            // 当前位置为 (innerX, doorEndZ)。
            // 需要返回 (baseX, doorEndZ)。
            // 也可使用 (baseX, doorEndZ - eps)。
            // 这是背向相机、朝 -Z 的直墙段。
            // 左侧从 -1.7 到 -3.5，向量为 (-1.8, 0)。
            // 法线应朝 -Z。
            // 只需渲染该面。
            const connWidth = Math.abs(baseX - innerX);
            const connX = (innerX + baseX) / 2;

            segments.push({
                type: 'connector',
                position: [connX, 0, doorEndZ],
                rotation: [0, 0, 0], // 平面默认朝 +Z。
                // 从 +Z 观察时能看到朝 +Z 的正面。
                // 此处需要背向相机，朝 -Z。
                // 因此 Y 轴旋转角为 PI。
                rotationY: Math.PI,
                width: connWidth
            });

            currentZ = doorEndZ;
        });

        // 最后的填充墙段。
        if (currentZ > endZ) {
            const segLength = currentZ - endZ;
            const segCenterZ = currentZ - segLength / 2;
            segments.push({
                type: 'filler',
                position: [baseX, 0, segCenterZ],
                rotation: [0, isLeft ? Math.PI / 2 : -Math.PI / 2, 0],
                width: segLength,
                isLeft,
                // 该段从门后较大 Z 一侧开始。
                trimHighZ: currentZ !== effectiveStart
            });
        }

        return segments;
    }, [effectiveStart, effectiveLength, doorPositions, zStart]);

    const leftSegments = useMemo(() => generateWallSegments('left'), [generateWallSegments]);
    const rightSegments = useMemo(() => generateWallSegments('right'), [generateWallSegments]);

    if (effectiveLength <= 0) return null;

    return (
        <group>
            {/* =============================================
                地面砖块。
                =============================================
                每块砖是带 kawalekpodlogi.png 纹理的平面。
                隔一块沿长度方向镜像，
                让相邻拼块使用纹理的同一条边衔接。
                
                可手动调整的设置：
                - TILE_LENGTH：单块地砖长度，单位为 3D 单位。
                - TILE_WIDTH：宽度，应匹配走廊宽度 7。
                - FLOOR_START_OFFSET：地面起点偏移。
            */}
            {(() => {
                // 地砖调节。
                const TILE_LENGTH = 10;          // 单块地砖沿走廊的长度。
                const CENTER_WIDTH = 5;          // 中间条带宽度，较窄木板的视觉效果更好。
                const SIDE_WIDTH = 1;            // 左右两侧条带的宽度。
                const FLOOR_START_OFFSET = 2;    // 起点偏移：正值更远，负值更靠近相机。

                const tiles = [];
                const floorY = -corridorHeight / 2;
                const segmentEndZ = effectiveStart - effectiveLength;

                const firstTileIndex = Math.floor(effectiveStart / TILE_LENGTH);
                let tileZ = firstTileIndex * TILE_LENGTH - TILE_LENGTH / 2 + FLOOR_START_OFFSET;

                while (tileZ + TILE_LENGTH / 2 > segmentEndZ) {
                    const globalTileIndex = Math.round(tileZ / TILE_LENGTH);
                    const isMirrored = Math.abs(globalTileIndex) % 2 === 1;

                    // 地面中间条带。
                    tiles.push(
                        <mesh
                            key={`floor-center-${tileZ.toFixed(1)}`}
                            position={[0, floorY, tileZ]}
                            rotation={[-Math.PI / 2, 0, Math.PI / 2]}
                            scale={[isMirrored ? -1 : 1, 1, 1]}
                        >
                            <planeGeometry args={[TILE_LENGTH, CENTER_WIDTH]} />
                            <meshBasicMaterial color="#e0e0e0"
                                map={floorTexture}
                                side={THREE.DoubleSide}
                                roughness={1}
                                metalness={0}
                            />
                        </mesh>
                    );

                    // 地面左侧条带：裁切纹理，不拉伸。
                    tiles.push(
                        <mesh
                            key={`floor-left-${tileZ.toFixed(1)}`}
                            position={[-(CENTER_WIDTH / 2 + SIDE_WIDTH / 2), floorY, tileZ]}
                            rotation={[-Math.PI / 2, 0, Math.PI / 2]}
                            scale={[isMirrored ? -1 : 1, 1, 1]}
                        >
                            <planeGeometry args={[TILE_LENGTH, SIDE_WIDTH]} />
                            <meshBasicMaterial color="#e0e0e0"
                                map={leftSideTexture}
                                side={THREE.DoubleSide}
                                roughness={1}
                                metalness={0}
                            />
                        </mesh>
                    );

                    // 地面右侧条带：裁切纹理，不拉伸。
                    tiles.push(
                        <mesh
                            key={`floor-right-${tileZ.toFixed(1)}`}
                            position={[(CENTER_WIDTH / 2 + SIDE_WIDTH / 2), floorY, tileZ]}
                            rotation={[-Math.PI / 2, 0, Math.PI / 2]}
                            scale={[isMirrored ? -1 : 1, 1, 1]}
                        >
                            <planeGeometry args={[TILE_LENGTH, SIDE_WIDTH]} />
                            <meshBasicMaterial color="#e0e0e0"
                                map={rightSideTexture}
                                side={THREE.DoubleSide}
                                roughness={1}
                                metalness={0}
                            />
                        </mesh>
                    );

                    tileZ -= TILE_LENGTH;
                }
                return tiles;
            })()}


            {/* 带纹理的天花板，交替排列以形成无缝图案。 */}
            {(() => {
                const tileLength = 10; // 匹配地砖长度。
                const tileWidth = 7;   // 天花板宽度与走廊一致。
                const tiles = [];
                const ceilingY = corridorHeight / 2;

                // 与地面保持相同的全局 Z 对齐。
                const segmentEndZ = effectiveStart - effectiveLength;

                // 第一块的位置使用与地面相同的微调偏移。
                const CEILING_START_OFFSET = 2; // 匹配地面偏移。
                const firstTileIndex = Math.floor(effectiveStart / tileLength);
                let tileZ = firstTileIndex * tileLength - tileLength / 2 + CEILING_START_OFFSET;

                while (tileZ + tileLength / 2 > segmentEndZ) {
                    // 用全局砖块索引决定交替图案。
                    const globalTileIndex = Math.round(tileZ / tileLength);
                    const isMirrored = Math.abs(globalTileIndex) % 2 === 1;

                    tiles.push(
                        <mesh
                            key={`ceiling-tile-${tileZ.toFixed(1)}`}
                            position={[0, ceilingY, tileZ]}
                            rotation={[Math.PI / 2, 0, isMirrored ? Math.PI : 0]}
                            scale={[isMirrored ? -1 : 1, 1, 1]}
                        >
                            <planeGeometry args={[tileWidth, tileLength]} />
                            <meshBasicMaterial color="#e0e0e0"
                                map={ceilingTexture}
                                side={THREE.DoubleSide}
                                roughness={1}
                                metalness={0}
                            />
                        </mesh>
                    );
                    tileZ -= tileLength;
                }
                return tiles;
            })()}

            {/* 渲染带纹理的墙段。 */}
            {/* 跳过 connector 和 door 分段，门段现由 DoorSection 处理。 */}
            {[...leftSegments, ...rightSegments]
                .filter(seg => seg.type === 'filler')
                .map((seg, i) => <FillerWall key={i} seg={seg} wallTexture={wallTexture} baseboardTexture={baseboardTexture} corridorHeight={corridorHeight} />)}



            {/* 踢脚线：复杂几何暂时简化或跳过。 */}
            {/* 初版为降低开销，跳过锯齿墙上的踢脚线。 */}
        </group>
    );
};

export default CorridorWalls;
