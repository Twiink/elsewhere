import { useTexture } from '../../../hooks/useMediaTexture';
import Text from '../SiteText';
import { useMemo, memo, Suspense, useEffect } from 'react';


import * as THREE from 'three';

import { ROOM_COMPONENTS, ROOM_LABELS } from '../../../config/roomResources';

// 房间配置。
const ROOM_CONFIG = {
    corridorWidth: 2.2,   // 较宽的前厅感。
    corridorHeight: 2.4,  // frameHeight - 0.1
    corridorDepth: 2,     // 较短，便于快速过渡。
    roomWidth: 30,
    roomHeight: 20,
    roomDepth: 25
};

const SUBTITLES = {
    "作品画廊": "探索我的创意项目",
    "生活手记": "翻翻生活里的小片段",
    "开发日志": "我的开发历程",
    "联系我": "欢迎与我联系"
};

// 踢脚线自然平铺：1582×94 像素，高 0.15 时宽约 2.524 单位。
const NATURAL_TILE_W = (1582 / 94) * 0.15;

/**
 * RoomInterior 房间内部组件。
 *
 * 缓存房间几何体，减少重复渲染并提升性能。
 * 包含过渡走廊和尽头的大房间。
 */
const RoomInterior = memo(({ label, showRoom, onReady, isExiting }) => {
    const { corridorWidth, corridorHeight, corridorDepth, roomWidth, roomHeight, roomDepth } = ROOM_CONFIG;
    const halfDepth = corridorDepth / 2;
    const roomZ = -corridorDepth - roomDepth / 2;

    // 加载走廊纹理。
    const floorTexSrc = useTexture('https://media.secknow-ai.com/space/textures/corridor/kawalekpodlogi.png?imageMogr2/thumbnail/1024x1024');
    const wallTexSrc = useTexture('https://media.secknow-ai.com/space/textures/corridor/wall_texture.png?imageMogr2/thumbnail/1024x512');
    const ceilingTexSrc = useTexture('https://media.secknow-ai.com/space/textures/corridor/ceiling_texture.png?imageMogr2/thumbnail/1024x512');
    const bbTexSrc = useTexture('https://media.secknow-ai.com/space/textures/corridor/texturadoprogow.png');

    // 缓存小走廊的纹理材质。
    const materials = useMemo(() => {
        // 地面。
        const floorTex = floorTexSrc.clone();
        floorTex.needsUpdate = true;
        floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
        floorTex.repeat.set(corridorDepth / 2.5, corridorWidth / 2.5);

        // 左墙。
        const wallTexL = wallTexSrc.clone();
        wallTexL.needsUpdate = true;
        wallTexL.wrapS = wallTexL.wrapT = THREE.RepeatWrapping;
        wallTexL.repeat.set(corridorDepth / 2, corridorHeight / 2);

        // 右墙，采用相同设置。
        const wallTexR = wallTexSrc.clone();
        wallTexR.needsUpdate = true;
        wallTexR.wrapS = wallTexR.wrapT = THREE.RepeatWrapping;
        wallTexR.repeat.set(corridorDepth / 2, corridorHeight / 2);

        // 天花板。
        const ceilTex = ceilingTexSrc.clone();
        ceilTex.needsUpdate = true;
        ceilTex.wrapS = ceilTex.wrapT = THREE.RepeatWrapping;
        ceilTex.repeat.set(corridorDepth / 2.5, corridorWidth / 2.5);

        // 左侧踢脚线。
        const bbLeft = bbTexSrc.clone();
        bbLeft.colorSpace = THREE.SRGBColorSpace;
        bbLeft.needsUpdate = true;
        bbLeft.wrapS = bbLeft.wrapT = THREE.RepeatWrapping;
        bbLeft.repeat.set(corridorDepth / NATURAL_TILE_W, 1);

        // 右侧踢脚线。
        const bbRight = bbTexSrc.clone();
        bbRight.colorSpace = THREE.SRGBColorSpace;
        bbRight.needsUpdate = true;
        bbRight.wrapS = bbRight.wrapT = THREE.RepeatWrapping;
        bbRight.repeat.set(corridorDepth / NATURAL_TILE_W, 1);

        return {
            corridorFloor: new THREE.MeshBasicMaterial({ color: '#e0e0e0',  map: floorTex, side: THREE.DoubleSide }),
            corridorWallL: new THREE.MeshBasicMaterial({ color: '#e0e0e0',  map: wallTexL, side: THREE.DoubleSide }),
            corridorWallR: new THREE.MeshBasicMaterial({ color: '#e0e0e0',  map: wallTexR, side: THREE.DoubleSide }),
            corridorCeiling: new THREE.MeshBasicMaterial({ color: '#e0e0e0',  map: ceilTex, side: THREE.DoubleSide }),
            bbLeft: new THREE.MeshBasicMaterial({ color: '#e0e0e0',  map: bbLeft, side: THREE.DoubleSide }),
            bbRight: new THREE.MeshBasicMaterial({ color: '#e0e0e0',  map: bbRight, side: THREE.DoubleSide }),
            threshold: new THREE.MeshBasicMaterial({ color: '#e0e0e0', 
                map: (() => {
                    const t = bbTexSrc.clone();
                    t.colorSpace = THREE.SRGBColorSpace;
                    t.needsUpdate = true;
                    t.wrapS = t.wrapT = THREE.RepeatWrapping;
                    t.repeat.set(corridorWidth / NATURAL_TILE_W, 1);
                    return t; })(),

                side: THREE.DoubleSide
            }),
            // 房间材质；已有自定义内容的房间保持平面风格。
            roomFloor: new THREE.MeshBasicMaterial({ color: '#e5e5e5', side: THREE.DoubleSide }),
            roomCeiling: new THREE.MeshBasicMaterial({ color: '#fafafa', side: THREE.DoubleSide }),
            roomWall: new THREE.MeshBasicMaterial({ color: '#f0f0f0', side: THREE.DoubleSide }),
            roomBackWall: new THREE.MeshBasicMaterial({ color: '#f5f5f5', side: THREE.DoubleSide }),
        };
    }, [floorTexSrc, wallTexSrc, ceilingTexSrc, bbTexSrc, corridorWidth, corridorHeight, corridorDepth]);

    // 缓存几何体。
    const geometries = useMemo(() => ({
        corridorSideWall: new THREE.PlaneGeometry(corridorDepth, corridorHeight),
        corridorFloorCeiling: new THREE.PlaneGeometry(corridorWidth, corridorDepth),
        corridorBaseboard: new THREE.PlaneGeometry(corridorDepth, 0.15),
        threshold: new THREE.PlaneGeometry(corridorWidth, 0.15),
        roomFloorCeiling: new THREE.PlaneGeometry(roomWidth, roomDepth),
        roomSideWall: new THREE.PlaneGeometry(roomDepth, roomHeight),
        roomBackWall: new THREE.PlaneGeometry(roomWidth, roomHeight)
    }), [corridorDepth, corridorHeight, corridorWidth, roomDepth, roomHeight, roomWidth]);

    useEffect(() => () => {
        Object.values(materials).forEach(material => {
            material.map?.dispose();
            material.dispose();
        });
    }, [materials]);

    useEffect(() => () => {
        Object.values(geometries).forEach(geometry => geometry.dispose());
    }, [geometries]);

    const Room = ROOM_COMPONENTS[ROOM_LABELS[label]];

    // 通用房间没有独立组件负责就绪通知，需在此触发 onReady。
    useEffect(() => {
        if (showRoom && !["作品画廊", "生活手记", "关于我", "联系我"].includes(label)) {
            onReady?.();
        }
    }, [showRoom, label, onReady]);

    return (
        <group position={[0, -0.149, 0]}>
            {/* 小走廊过渡区域。 */}
            {/* 左墙。 */}
            <mesh
                position={[-corridorWidth / 2, 0, -halfDepth]}
                rotation={[0, Math.PI / 2, 0]}
                geometry={geometries.corridorSideWall}
                material={materials.corridorWallL}
            />

            {/* 右墙。 */}
            <mesh
                position={[corridorWidth / 2, 0, -halfDepth]}
                rotation={[0, -Math.PI / 2, 0]}
                geometry={geometries.corridorSideWall}
                material={materials.corridorWallR}
            />

            {/* 地面。 */}
            <mesh
                position={[0, -corridorHeight / 2, -halfDepth]}
                rotation={[-Math.PI / 2, 0, 0]}
                geometry={geometries.corridorFloorCeiling}
                material={materials.corridorFloor}
            />

            {/* 天花板。 */}
            <mesh
                position={[0, corridorHeight / 2, -halfDepth]}
                rotation={[Math.PI / 2, 0, 0]}
                geometry={geometries.corridorFloorCeiling}
                material={materials.corridorCeiling}
            />

            {/* 左侧踢脚线。 */}
            <mesh
                position={[-corridorWidth / 2 + 0.01, -corridorHeight / 2 + 0.075, -halfDepth]}
                rotation={[0, Math.PI / 2, 0]}
                geometry={geometries.corridorBaseboard}
                material={materials.bbLeft}
            />

            {/* 右侧踢脚线。 */}
            <mesh
                position={[corridorWidth / 2 - 0.01, -corridorHeight / 2 + 0.075, -halfDepth]}
                rotation={[0, -Math.PI / 2, 0]}
                geometry={geometries.corridorBaseboard}
                material={materials.bbRight}
            />

            {/* 小走廊末端的门槛。 */}
            <mesh
                position={[0, -corridorHeight / 2 + 0.005, -corridorDepth]}
                rotation={[-Math.PI / 2, 0, 0]}
                geometry={geometries.threshold}
                material={materials.threshold}
            />

            {/* 房间内容。 */}
            {showRoom && (
                <group>
                    {Room ? (
                        <group position={[0, -0.5, -corridorDepth]}>
                            <Suspense fallback={null}>
                                <Room showRoom={showRoom} onReady={onReady} isExiting={isExiting} />
                            </Suspense>
                        </group>
                    ) : (
                        // 其他区域使用的默认通用房间。
                        <group position={[0, roomHeight / 2 - corridorHeight / 2, roomZ]}>
                            {/* 地面。 */}
                            <mesh
                                position={[0, -roomHeight / 2, 0]}
                                rotation={[-Math.PI / 2, 0, 0]}
                                geometry={geometries.roomFloorCeiling}
                                material={materials.roomFloor}
                            />

                            {/* 地面网格。 */}
                            <gridHelper
                                args={[Math.min(roomWidth, roomDepth), 20, '#cccccc', '#dddddd']}
                                position={[0, -roomHeight / 2 + 0.01, 0]}
                            />

                            {/* 天花板。 */}
                            <mesh
                                position={[0, roomHeight / 2, 0]}
                                rotation={[Math.PI / 2, 0, 0]}
                                geometry={geometries.roomFloorCeiling}
                                material={materials.roomCeiling}
                            />

                            {/* 后墙。 */}
                            <mesh
                                position={[0, 0, -roomDepth / 2]}
                                geometry={geometries.roomBackWall}
                                material={materials.roomBackWall}
                            />

                            {/* 左墙。 */}
                            <mesh
                                position={[-roomWidth / 2, 0, 0]}
                                rotation={[0, Math.PI / 2, 0]}
                                geometry={geometries.roomSideWall}
                                material={materials.roomWall}
                            />

                            {/* 右墙。 */}
                            <mesh
                                position={[roomWidth / 2, 0, 0]}
                                rotation={[0, -Math.PI / 2, 0]}
                                geometry={geometries.roomSideWall}
                                material={materials.roomWall}
                            />

                            {/* 标题。 */}
                            <Text
                                position={[0, 2, -roomDepth / 2 + 2]}
                                fontSize={4}
                                color="#1a1a1a"
                                anchorX="center"
                                anchorY="middle"
                                overflowWrap="break-word"
                                maxWidth={roomWidth * 0.8}
                                textAlign="center"
                            >
                                {label}
                            </Text>

                            {/* 副标题。 */}
                            <Text
                                position={[0, -1, -roomDepth / 2 + 2]}
                                fontSize={0.8}
                                color="#666666"
                                anchorX="center"
                                anchorY="middle"
                                overflowWrap="break-word"
                                maxWidth={roomWidth * 0.7}
                                textAlign="center"
                            >
                                {SUBTITLES[label] || ''}
                            </Text>

                            {/* 光照，已禁用。 */}
                            {/* <pointLight position={[0, roomHeight / 2 - 2, 0]} intensity={1} distance={40} color="#ffffff" /> */}
                            {/* <pointLight position={[0, 0, -roomDepth / 4]} intensity={0.5} distance={30} color="#fffaf0" /> */}
                        </group>
                    )}
                </group>
            )}
        </group>
    );
});

RoomInterior.displayName = 'RoomInterior';

export default RoomInterior;
