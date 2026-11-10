import { useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { useTextureCopy } from '../../../hooks/useTextureCopy';

/**
 * EmptyCorridor 空走廊组件。
 * 
 * 加载阶段使用的简单走廊墙面。
 * 仅保留走廊结构，不包含门、装饰或 ITOM。
 * 用于加载期间自动滚动。
 */
const EmptyCorridor = ({ camera }) => {
    const corridorWidth = 25; // 宽地面。
    const [segmentBase, setSegmentBase] = useState(0);

    // 加载地面纹理。
    const floorSource = useTexture('https://media.secknow-ai.com/space/textures/entrance/floor_paper.png?imageMogr2/thumbnail/1024x512');
    const floorTexture = useTextureCopy(floorSource, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, repeatX: 6.6, repeatY: 20 });

    // 相机进入新分段时才更新分段基准，避免逐帧更新。
    useFrame(() => {
        if (!camera) return;
        const segmentLength = 40;
        const newBase = Math.floor(camera.position.z / segmentLength) * segmentLength;
        if (newBase !== segmentBase) {
            setSegmentBase(newBase);
        }
    });

    // 在相机周围生成走廊分段。
    const segments = useMemo(() => {
        const result = [];
        for (let i = -2; i <= 2; i++) {
            result.push(segmentBase + i * 40);
        }
        return result;
    }, [segmentBase]);

    return (
        <group>
            {segments.map((zStart) => (
                <CorridorSegmentEmpty
                    key={zStart}
                    zStart={zStart}
                    corridorWidth={corridorWidth}
                    floorTexture={floorTexture}
                />
            ))}
        </group>
    );
};

/**
 * 单个空走廊分段。
 */
const CorridorSegmentEmpty = ({ zStart, corridorWidth, floorTexture }) => {
    const length = 40;
    const zCenter = zStart - length / 2;

    return (
        <group>
            {/* 带纸张纹理的地面。 */}
            {/* Y=-1.75 为地面高度，数值越小地面越低。 */}
            <mesh
                position={[0, -2, zCenter]}
                rotation={[-Math.PI / 2, 0, 0]}
            >
                <planeGeometry args={[corridorWidth, length]} />
                <meshBasicMaterial
                    map={floorTexture}
                    transparent={true}
                    alphaTest={0.1}
                    roughness={1}
                    metalness={0}
                    color="#e0e0e0" // 保持白色基底。
                />
            </mesh>

            {/* 简单光照，已禁用。 */}
            {/* <pointLight
                position={[0, 1.2, zCenter]}
                intensity={0.4}
                color="#fffaf0"
                distance={20}
            /> */}
        </group>
    );
};

export default EmptyCorridor;
