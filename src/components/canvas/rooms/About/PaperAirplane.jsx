import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Edges } from '@react-three/drei';

/**
 * PaperAirplane 纸飞机组件。
 * 
 * 低多边形折纸风格纸飞机。
 * 使用 BufferGeometry，完全控制形状。
 */
const PaperAirplane = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, color = '#f5f5f5' }) => {
    const meshRef = useRef();

    // 创建纸飞机几何体。
    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();

        // 经典纸飞机，从上方看朝前方 -Z。
        // 所有尺寸均为局部坐标，以原点为中心。
        const vertices = new Float32Array([
            // 主体顶面。
            // 机头尖端。
            0, 0, -1.5,           // 0：前端尖点。

            // 宽机翼尖端。
            -1.2, 0.05, 0.3,      // 1：左翼尖。
            1.2, 0.05, 0.3,       // 2：右翼尖。

            // 机身中心折线，略微隆起。
            0, 0.15, -0.5,        // 3：折线前端。
            0, 0.12, 0.5,         // 4：折线后端。

            // 机尾。
            -0.3, 0.08, 0.8,      // 5：左尾端。
            0.3, 0.08, 0.8,       // 6：右尾端。
            0, 0.1, 0.6,          // 7：尾部上方中心。

            // 底面顶点：镜像后略微下移。
            0, -0.02, -1.5,       // 8：机头底部。
            -1.2, -0.02, 0.3,     // 9：左翼底部。
            1.2, -0.02, 0.3,      // 10：右翼底部。
            0, 0, 0.5,            // 11：尾部底面中心。
        ]);

        // 各面的三角形索引。
        const indices = [
            // 顶面。
            // 左翼：机头、翼尖、折线。
            0, 1, 3,
            1, 4, 3,
            1, 5, 4,
            5, 7, 4,

            // 右翼：机头、折线、翼尖。
            0, 3, 2,
            3, 4, 2,
            4, 6, 2,
            4, 7, 6,

            // 底面。
            // 左侧底面。
            8, 11, 9,

            // 右侧底面。
            8, 10, 11,

            // 侧面连接边。
            // 左边缘。
            0, 8, 1,
            8, 9, 1,
            1, 9, 5,

            // 右边缘。
            0, 2, 8,
            8, 2, 10,
            2, 6, 10,

            // 后边缘。
            5, 9, 11,
            5, 11, 7,
            6, 7, 11,
            6, 11, 10,
        ];

        geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();

        return geo;
    }, []);

    return (
        <group position={position} rotation={rotation} scale={scale}>
            <mesh ref={meshRef} geometry={geometry}>
                <meshBasicMaterial
                    color={color}
                    side={THREE.DoubleSide}
                />
                <Edges
                    linewidth={2}
                    threshold={15}
                    color="#888888"
                />
            </mesh>

            {/* 顶部脊线角度较浅，Edges 阈值会忽略，因此显式绘制。 */}
            <line>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={4}
                        itemSize={3}
                        array={new Float32Array([
                            0, 0, -1.5,
                            0, 0.15, -0.5,
                            0, 0.12, 0.5,
                            0, 0.1, 0.6
                        ])}
                    />
                </bufferGeometry>
                <lineBasicMaterial color="#888888" linewidth={2} />
            </line>
        </group>
    );
};

export default PaperAirplane;
