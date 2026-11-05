import { useMemo, memo } from 'react';
import { Text } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

import CorridorWalls from './CorridorWalls';
import DoorSection from './DoorSection';
import SegmentDoors from './SegmentDoors';
import Avatar from './Avatar';
import HeroText from './HeroText';
import Doodles from './Doodles';
import CorridorDecorations from './CorridorDecorations';

/**
 * CorridorSegment 走廊分段组件。
 * 
 * 无限走廊中可重复的一段。
 * 每段包含墙面、人物、网站标题、门和装饰。
 * 
 * 每段长度：80 单位。
 * 位置由 segmentIndex × segmentLength 决定。
 */
const SEGMENT_LENGTH = 80;

// 锯齿形几何常量，与 CorridorWalls 的逻辑保持一致。
const WALL_X_OUTER = 3.5;
const WALL_X_INNER = 1.7;
const DOOR_Z_SPAN = 4;
// 墙面相对于走廊轴的角度。
const WALL_ANGLE = Math.atan2(WALL_X_OUTER - WALL_X_INNER, DOOR_Z_SPAN);


const CorridorSegment = ({
    segmentIndex = 0,
    onDoorEnter,
    hideSegmentDoors = false, // 仅隐藏 SegmentDoors，保留内容预加载。
    zClip = 100000, // 裁切平面，只渲染 Z < zClip 的内容。
    setCameraOverride // 接管相机控制的函数。
}) => {
    const isNarrow = useThree(state => state.size.width < 640);

    // 按分段索引计算 Z 偏移。
    // 第 0 段从 Z=10 延伸至 Z=-70。
    const zOffset = 10 - (segmentIndex * SEGMENT_LENGTH);

    // 当前分段内的门位置，相对于分段起点。
    const doors = useMemo(() => {
        const doorDefs = [
            {
                id: `gallery-${segmentIndex}`,
                roomId: 'gallery',
                relativeZ: -18,
                side: 'left',
                label: "作品画廊",
                icon: '◈',
                color: '#f5efe6'
            },
            {
                id: `studio-${segmentIndex}`,
                roomId: 'studio',
                relativeZ: -32,
                side: 'right',
                label: "内容工作室",
                icon: '▶',
                color: '#e6f5ef'
            },
            {
                id: `about-${segmentIndex}`,
                roomId: 'about',
                relativeZ: -48,
                side: 'left',
                label: "关于我",
                icon: '★',
                color: '#efe6f5',
                enterDistance: 25 // 深入房间，云层位于远处。
            },
            {
                id: `connect-${segmentIndex}`,
                roomId: 'contact',
                relativeZ: -62,
                side: 'right',
                label: "联系我",
                icon: '✉',
                color: '#f5e6e6'
            },
        ];

        return doorDefs.map(def => {
            // 计算锯齿形墙面对应的位置与旋转。
            const xBase = (WALL_X_OUTER + WALL_X_INNER) / 2; // 倾斜墙面的中点。
            const xPos = def.side === 'left' ? -xBase : xBase;

            // 旋转：
            // 左墙原法线为 (1,0,0)，Y 轴旋转 90°；现在向相机（+Z）倾斜。
            // 顺时针旋转 WALL_ANGLE。
            // 右墙原法线为 (-1,0,0)，Y 轴旋转 -90°；现在向相机（+Z）倾斜。
            // 逆时针旋转 WALL_ANGLE。

            const baseRot = def.side === 'left' ? Math.PI / 2 : -Math.PI / 2;
            const rotOffset = def.side === 'left' ? -WALL_ANGLE : WALL_ANGLE;

            return {
                ...def,
                x: xPos,
                rotation: baseRot + rotOffset
            };
        });
    }, [segmentIndex]);

    return (
        <group position={[0, 0, 0]}>
            {/* 走廊墙面。 */}
            {/* 传入门位置，让墙面正确生成缺口与角度。 */}
            <CorridorWalls
                zStart={zOffset}
                length={SEGMENT_LENGTH}
                doorPositions={doors}
                zClip={zClip}
            />

            {/* 欢迎区域：位于分段起点，已向前移。 */}
            <group position={[0, 0, zOffset - 2]}>
                {/* 人物与标题沿走廊中轴上下排列。 */}
                <HeroText position={[0, isNarrow ? 0.75 : 0.95, -0.5]} />

                <Avatar
                    position={[0, isNarrow ? -0.9 : -0.85, -0.3]}
                    height={isNarrow ? 1.7 : 1.8}
                />


                {/* 人物周围的涂鸦。 */}
                <Doodles />

                {/* 分段编号，仅调试用，可后续移除。 */}
                <Text
                    position={[1.7, 1.4, 0.3]}
                    fontSize={0.12}
                    color="#ccc"
                    anchorX="center"
                >
                    #{segmentIndex}
                </Text>
            </group>

            {/* 门区域：墙、门及标签组成一个单元。 */}
            {/* 第 -1 段在入口动画期间隐藏。 */}
            {!hideSegmentDoors && doors.map((door) => (
                <DoorSection
                    key={door.id}
                    position={[
                        door.x,
                        0,
                        zOffset + door.relativeZ + 2
                    ]}
                    side={door.side}
                    label={door.label}
                    roomId={door.roomId}
                    icon={door.icon}
                    color={door.color}
                    enterDistance={door.enterDistance}
                    onEnter={() => onDoorEnter?.(door.roomId)}
                    setCameraOverride={setCameraOverride}
                    segmentIndex={segmentIndex}
                />
            ))}

            {/* 光照。 */}
            {/* 移除视觉影响较小的点光源，以降低开销。 */}

            <CorridorDecorations
                segmentLength={SEGMENT_LENGTH}
                zOffset={zOffset}
                corridorWidth={WALL_X_OUTER * 2}
                corridorHeight={3.5}
                zClip={zClip}
                setCameraOverride={setCameraOverride}
            />

            {/* 分段尽头的门，入口阶段隐藏。 */}
            {!hideSegmentDoors && (
                <SegmentDoors
                    position={[0, 0, zOffset - SEGMENT_LENGTH + 5]}
                    corridorHeight={3.5}
                />
            )}
        </group>
    );
};

const MemoizedCorridorSegment = memo(CorridorSegment);

export { SEGMENT_LENGTH, WALL_X_OUTER, WALL_X_INNER, DOOR_Z_SPAN };
export default MemoizedCorridorSegment;
