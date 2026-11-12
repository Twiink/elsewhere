import { useState, useCallback, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

import CorridorSegment, { SEGMENT_LENGTH } from './CorridorSegment';
import { CorridorActivityContext } from '../../../context/CorridorActivityContext';

/**
 * 按相机位置切换分段显隐的包装组件。
 * 隐藏完全位于相机后方的分段，大幅减少绘制调用。
 */
const SegmentVisibilityWrapper = ({ children, segmentIndex }) => {
    const groupRef = useRef();
    const activity = useRef(true);
    const { camera } = useThree();

    // 当前分段的 Z 边界。
    // 第 0 段：Z=10 至 Z=-70。
    // 第 1 段：Z=-70 至 Z=-150。
    const startZ = 10 - (segmentIndex * SEGMENT_LENGTH);
    const endZ = startZ - SEGMENT_LENGTH;

    useFrame(() => {
        if (!groupRef.current) return;
        // 相机朝向 -Z。
        // 相机明显越过分段时（Z 远小于 endZ）隐藏该段。
        // 缓冲从 20 缩小至 5；越过分段 5 单位即隐藏，以释放 CPU。
        const isBehindCamera = camera.position.z < endZ - 5;
        // 相机远在分段后方时（Z 大于 startZ 加缓冲）也隐藏该段。
        const isFarAhead = camera.position.z > startZ + 30;

        const isVisible = !(isBehindCamera || isFarAhead);
        activity.current = isVisible;

        if (groupRef.current.visible !== isVisible) {
            groupRef.current.visible = isVisible;
        }
    });

    return (
        <group ref={groupRef}>
            <CorridorActivityContext.Provider value={activity}>{children}</CorridorActivityContext.Provider>
        </group>
    );
};

/**
 * InfiniteCorridorManager 无限走廊管理组件。
 * 
 * 动态生成和移除走廊分段。
 * 
 * hideDoorsForSegments：需要隐藏 SegmentDoors 的分段索引数组。
 * 入口阶段用于避免门重复，同时保留内容预加载。
 */
const InfiniteCorridorManager = ({
    onDoorEnter,
    hideDoorsForSegments = [], // 需要隐藏 SegmentDoors 的分段。
    clipSegmentNeg1 = false, // 是否在 EntranceDoors 处裁切第 -1 段。
    setCameraOverride // 接管相机控制的函数。
}) => {
    const { camera } = useThree();
    // 预先挂载第 0、1 段，让着色器在加载阶段编译。
    // 不预挂载第 -1 段，避免与入口门重叠。
    // 相机到达入口时动态挂载，该段位于相机后方，卡顿不可见。
    const [activeSegments, setActiveSegments] = useState([0, 1]);
    const previousSegment = useRef(null);

    // 计算相机当前所在分段。
    const getSegmentFromZ = useCallback((z) => {
        return Math.floor((10 - z) / SEGMENT_LENGTH);
    }, []);

    // 根据相机位置更新活动分段。
    useFrame(() => {
        const currentSegment = getSegmentFromZ(camera.position.z);
        if (previousSegment.current === currentSegment) return;
        previousSegment.current = currentSegment;

        // 渲染前一段、当前段和下一段。
        const shouldBeActive = [
            currentSegment - 1,
            currentSegment,
            currentSegment + 1
        ];

        setActiveSegments(shouldBeActive);
    });

    return (
        <group>
            {activeSegments.map((segmentIndex) => (
                <SegmentVisibilityWrapper key={`seg-wrap-${segmentIndex}`} segmentIndex={segmentIndex}>
                    <CorridorSegment
                        key={`segment-${segmentIndex}`}
                        segmentIndex={segmentIndex}
                        onDoorEnter={onDoorEnter}
                        hideSegmentDoors={hideDoorsForSegments.includes(segmentIndex)}
                        zClip={clipSegmentNeg1 && segmentIndex === -1 ? 22 : 100000}
                        setCameraOverride={setCameraOverride}
                    />
                </SegmentVisibilityWrapper>
            ))}
        </group>
    );
};

export default InfiniteCorridorManager;
