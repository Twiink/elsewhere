import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, Float32BufferAttribute, UniformsLib, UniformsUtils } from 'three';
import { usePerformance } from '../../../context/contexts';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { createSketchTexture } from './sketchTextures';
import { seededRandom } from '../../../utils/sceneRandom';

const SMOKE_SOURCES = [[-6.3, 2.2, -9.2], [8.4, 2.5, -9.2], [14.5, 2, -9.2]];
const settingsByKind = { dust: { count: 160, mode: 0 }, firefly: { count: 120, mode: 1 }, smoke: { count: 42, mode: 2 } };
const vertexShader = `
    attribute float aSeed;
    attribute float aSize;
    uniform float uTime, uScroll, uCenterZ, uPointScale, uFar, uMode;
    varying float vOpacity;
    #include <fog_pars_vertex>
    void main() {
        vec3 p = position;
        float seed = aSeed * 6.283185;
        float scale = aSize;
        float alpha = 0.48;
        if (uMode < 0.5) {
            p.x += sin(uTime * 0.16 + seed) * 0.18;
            p.y += sin(uTime * 0.12 + seed * 2.0) * 0.28;
            p.z += uCenterZ;
            alpha = 0.18 + 0.13 * sin(seed + uTime * 0.2);
        } else if (uMode < 1.5) {
            p.z = -9.0 - mod(-p.z - 9.0 - uScroll, 74.0);
            p.x += sin(uTime * 0.38 + seed) * 0.65;
            p.y += sin(uTime * 0.52 + seed * 1.7) * 0.42;
            alpha = 0.5 + 0.28 * sin(uTime * 1.1 + seed);
        } else {
            float life = fract(aSeed + uTime * 0.075);
            p.y += life * 4.4;
            p.x += sin(life * 5.0 + seed) * 0.28 + life * 0.5;
            scale *= 0.35 + life * 1.1;
            alpha = sin(life * 3.14159265) * 0.64;
        }
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        vOpacity = alpha * (1.0 - smoothstep(uFar * 0.62, uFar, length(mvPosition.xyz)));
        if (mvPosition.z > -0.1) vOpacity = 0.0;
        gl_PointSize = clamp(scale * uPointScale / max(0.1, -mvPosition.z), 1.0, 140.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
    }
`;
const fragmentShader = `
    uniform sampler2D uMap;
    varying float vOpacity;
    #include <fog_pars_fragment>
    void main() {
        vec4 ink = texture2D(uMap, vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y));
        float alpha = ink.a * vOpacity;
        if (alpha < 0.005) discard;
        gl_FragColor = vec4(ink.rgb, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
    }
`;

export default function AtmosphereParticles({ kind, active = true, scrollProgressRef }) {
    const { settings } = usePerformance();
    const reducedMotion = useReducedMotion();
    const points = useRef();
    const nextUpdate = useRef(0);
    const { count, mode } = settingsByKind[kind];
    const resources = useMemo(() => {
        const random = seededRandom(73 + mode * 41);
        const positions = [], seeds = [], sizes = [];
        for (let i = 0; i < count; i++) {
            if (kind === 'smoke') positions.push(...SMOKE_SOURCES[i % SMOKE_SOURCES.length]);
            else if (kind === 'firefly') positions.push((random() < 0.5 ? -1 : 1) * (2.4 + random() * 8), 0.5 + random() * 8, -9 - random() * 74);
            else positions.push((random() - 0.5) * 5.8, -1 + random() * 5, -2 - random() * 36);
            seeds.push(random());
            sizes.push(kind === 'smoke' ? 1.1 + random() * 0.6 : kind === 'firefly' ? 0.35 + random() * 0.3 : 0.035 + random() * 0.045);
        }
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
        geometry.setAttribute('aSeed', new Float32BufferAttribute(seeds, 1));
        geometry.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
        const texture = createSketchTexture(kind);
        const uniforms = Object.assign(UniformsUtils.merge([UniformsLib.fog]), {
            uTime: { value: 0 }, uScroll: { value: 0 }, uCenterZ: { value: 0 },
            uPointScale: { value: 700 }, uFar: { value: 80 }, uMode: { value: mode }, uMap: { value: texture },
        });
        return { geometry, texture, uniforms };
    }, [kind, count, mode]);

    useEffect(() => {
        resources.geometry.setDrawRange(0, Math.max(6, Math.round(count * settings.particleCount)));
        if (points.current) points.current.material.uniforms.uFar.value = settings.detailDistance;
    }, [resources, count, settings.particleCount, settings.detailDistance]);
    useEffect(() => () => { resources.geometry.dispose(); resources.texture.dispose(); }, [resources]);

    useFrame(({ clock, camera, size, viewport }) => {
        if (!active || !points.current || clock.elapsedTime < nextUpdate.current) return;
        nextUpdate.current = clock.elapsedTime + 1 / settings.animationFps;
        const u = points.current.material.uniforms;
        u.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
        u.uScroll.value = scrollProgressRef?.current ?? 0;
        u.uCenterZ.value = kind === 'dust' ? camera.position.z : 0;
        u.uPointScale.value = size.height * viewport.dpr / (2 * Math.tan(camera.fov * Math.PI / 360));
    });
    return <points ref={points} name={`hand-drawn-${kind}`} geometry={resources.geometry} visible={active} frustumCulled={false} renderOrder={-1}>
        <shaderMaterial uniforms={resources.uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} transparent depthWrite={false} fog toneMapped={false} />
    </points>;
}
