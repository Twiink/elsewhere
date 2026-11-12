import { useMemo, useRef } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { Object3D, Quaternion, Euler, Vector3 } from 'three';
import { MediaTextureLoader } from '../../../../media/MediaTextureLoader';
import { usePerformance } from '../../../../context/contexts';
import { useReducedMotion } from '../../../../hooks/useReducedMotion';
import { seededRandom } from '../../../../utils/sceneRandom';

const CLOUDS = [
    ['cloud-rounded-bold', 1.894], ['cloud-flat-bottom-bold', 2.459],
    ['cloud-wide-sketch', 3.577], ['cloud-rounded-sketch', 1.794],
    ['cloud-tall-sketch', 1.997], ['cloud-puffy-bold', 1.905],
    ['cloud-horizon-sketch', 3], ['cloud-soft-bold', 1.875],
];
const URLS = CLOUDS.map(([name]) => `/media/images/textures/clouds/${name}.webp`);
const DEFAULT_ROTATION = [0, -Math.PI / 3, 0];

function createCloudPool(count, seed) {
    const random = seededRandom(seed);
    const pool = [];
    for (let index = 0; index < count; index++) pool.push({
        y: 6 + random() * 8, z: -5 - random() * 30,
        speed: 0.1 + random() * 0.15, offset: (index / count) * 80 + random() * 3,
        scale: 0.5 + random() * 1.2, opacity: 0.4 + random() * 0.3,
        texture: Math.floor(random() * CLOUDS.length), lodRank: (index * 0.61803398875) % 1,
    });
    return pool;
}

function addCloudOpacity(shader) {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float cloudOpacity; varying float vCloudOpacity;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCloudOpacity = cloudOpacity;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vCloudOpacity;')
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vCloudOpacity;');
}

function CloudBatch({ clouds, texture, aspect, capacity, rotation }) {
    const mesh = useRef();
    const nextUpdate = useRef(0);
    const { settings } = usePerformance();
    const reducedMotion = useReducedMotion();
    const [rx, ry, rz] = rotation;
    const offset = useMemo(() => new Quaternion().setFromEuler(new Euler(rx, ry, rz)), [rx, ry, rz]);
    const dummy = useMemo(() => new Object3D(), []);
    const world = useMemo(() => new Vector3(), []);
    const opacity = useMemo(() => new Float32Array(capacity), [capacity]);

    useFrame(({ camera, clock }) => {
        if (!mesh.current || clock.elapsedTime < nextUpdate.current) return;
        nextUpdate.current = clock.elapsedTime + 1 / settings.animationFps;
        const time = reducedMotion ? 0 : clock.elapsedTime;
        const opacityAttribute = mesh.current.geometry.attributes.cloudOpacity;
        let visibleCount = 0;
        dummy.quaternion.copy(camera.quaternion).multiply(offset);
        for (let i = 0; i < clouds.length; i++) {
            const cloud = clouds[i];
            const x = 45 - ((time * cloud.speed + cloud.offset) % 90);
            dummy.position.set(x, cloud.y, cloud.z);
            world.copy(dummy.position).applyMatrix4(mesh.current.matrixWorld);
            const distance = world.distanceTo(camera.position);
            const far = settings.detailDistance * (0.6 + cloud.lodRank * 0.4);
            const fade = Math.max(0, Math.min(1, (far - distance) / (far * 0.2)));
            if (fade < 0.01) continue;
            const width = 2.5 * cloud.scale;
            dummy.scale.set(width, width / aspect, 1);
            dummy.updateMatrix();
            mesh.current.setMatrixAt(visibleCount, dummy.matrix);
            opacityAttribute.setX(visibleCount, cloud.opacity * fade);
            visibleCount++;
        }
        mesh.current.count = visibleCount;
        mesh.current.instanceMatrix.needsUpdate = true;
        opacityAttribute.needsUpdate = true;
    });

    return <instancedMesh ref={mesh} name="sketch-cloud-batch" args={[undefined, undefined, capacity]} frustumCulled={false}>
        <planeGeometry args={[1, 1]}>
            <instancedBufferAttribute attach="attributes-cloudOpacity" args={[opacity, 1]} />
        </planeGeometry>
        <meshBasicMaterial map={texture} color="#e0e0e0" transparent depthWrite={false} onBeforeCompile={addCloudOpacity} />
    </instancedMesh>;
}

export default function GalleryClouds({ count = 12, seed = 42, rotationOffset = DEFAULT_ROTATION }) {
    const { settings } = usePerformance();
    const textures = useLoader(MediaTextureLoader, URLS);
    const pool = useMemo(() => createCloudPool(count, seed), [count, seed]);
    const groups = useMemo(() => {
        const limit = Math.min(count, Math.max(8, Math.ceil(count * settings.cloudDensity)));
        // 均匀抽取整片天空，低档也保留左右两侧的云层。
        const active = Array.from({ length: limit }, (_, index) => pool[Math.floor(index * pool.length / limit)]);
        return CLOUDS.map((_, index) => active.filter(cloud => cloud.texture === index));
    }, [pool, count, settings.cloudDensity]);
    return <group name="sketch-clouds">{groups.map((clouds, index) => clouds.length > 0 && <CloudBatch
        key={index} clouds={clouds} texture={textures[index]} aspect={CLOUDS[index][1]}
        capacity={count} rotation={rotationOffset}
    />)}</group>;
}
