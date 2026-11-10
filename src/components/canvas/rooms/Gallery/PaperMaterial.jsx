import { forwardRef, useMemo, useRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * PaperMaterial 纸张材质。
 * 通过自定义顶点着色器支持弯曲的 MeshStandardMaterial。
 * 
 * 可通过 ref 访问的 uniform：
 * - uBend：浮点数，控制沿竖轴的弯曲程度。
 * - uBendAxis：Vector2，弯曲方向，尚未实现，默认沿 Y 轴弯曲。
 */
const PaperMaterial = forwardRef(({ color = '#e0e0e0', roughness = 0.6, map, side = THREE.DoubleSide, paintProgress, roomOrigin, ...props }, ref) => {
    const materialRef = useRef();

    // 着色器注入逻辑。
    const onBeforeCompile = useMemo(() => (shader) => {
        // 添加 uniform。
        shader.uniforms.uBend = { value: 0 };
        shader.uniforms.uTime = { value: 0 };
        shader.uniforms.uWindStrength = { value: 0 }; // 额外飘动强度。
        shader.uniforms.mapBack = { value: null }; // 背面纹理。
        shader.uniforms.mapPainted = { value: null }; // 彩色纹理。
        shader.uniforms.uProgress = { value: 0.0 }; // 显现进度。
        shader.uniforms.uPaintProgress = paintProgress || { value: 1.0 };
        shader.uniforms.uRoomOrigin = roomOrigin || { value: new THREE.Vector3(0, 0, 0) };

        // 在顶点着色器前添加 uniform。
        shader.vertexShader = `
            uniform float uBend;
            uniform float uTime;
            uniform float uWindStrength;
            varying vec3 vWorldPositionColor;
        ` + shader.vertexShader;

        // 在 gl_Position 前注入弯曲逻辑。
        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            
            vWorldPositionColor = (modelMatrix * vec4(position, 1.0)).xyz;
            // 简单抛物线弯曲。
            float bendAmount = pow(transformed.y, 2.0) * uBend;
            transformed.z += bendAmount;

            // 添加轻微风吹飘动。
            // 基础飘动叠加悬停时额外风力。
            float totalWind = 0.02 + uWindStrength; 
            // 减慢飘动：速度降为 uTime×2.0，频率降为 y×2.0。
            float flutter = sin(uTime * 2.0 + transformed.y * 2.0) * totalWind * (1.0 + abs(uBend * 3.0));
            transformed.z += flutter;
            `
        );

        // 注入片元着色器逻辑，实现双面纹理。
        shader.fragmentShader = `
            uniform sampler2D mapBack;
            uniform sampler2D mapPainted;
            uniform float uProgress;
            uniform float uPaintProgress;
            uniform vec3 uRoomOrigin;
            varying vec3 vWorldPositionColor;

            float revealRand(vec2 n) { 
                return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
            }

            float revealNoise(vec2 p){
                vec2 ip = floor(p);
                vec2 u = fract(p);
                u = u*u*(3.0-2.0*u);
                float res = mix(
                    mix(revealRand(ip),revealRand(ip+vec2(1.0,0.0)),u.x),
                    mix(revealRand(ip+vec2(0.0,1.0)),revealRand(ip+vec2(1.0,1.0)),u.x),u.y);
                return res*res;
            }
        ` + shader.fragmentShader;

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <map_fragment>',
            `
            #ifdef USE_MAP
                vec4 texColor = texture2D( map, vMapUv );

                // 新增笔刷显现逻辑
                if (gl_FrontFacing && uProgress > 0.001) {
                    vec4 paintedColor = texture2D(mapPainted, vMapUv);
                    float rn = revealNoise(vMapUv * 15.0) * 0.15;
                    float maskValue = (1.0 - vMapUv.y) + rn;
                    float threshold = uProgress * 1.5;
                    if (maskValue < threshold) {
                        texColor = paintedColor;
                    }
                }
                
                // 按要求翻转 Y 纹理坐标，使图像上下颠倒。
                // X 保持标准 vMapUv.x，背面观察会自然产生镜像效果。
                vec2 backUv = vec2(vMapUv.x, 1.0 - vMapUv.y);
                vec4 backColor = texture2D( mapBack, backUv );
                
                vec4 sampledDiffuseColor = gl_FrontFacing ? texColor : backColor;
                
                diffuseColor *= sampledDiffuseColor;
                
                // 略微提亮，提高可读性。
                diffuseColor.rgb *= 1.4;
            #endif
            `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `
            #include <dithering_fragment>

            // 上色方向。
            // 相对于房间原点计算位置，使效果
            // 不受房间所在走廊分段的影响。
            vec3 localPos = vWorldPositionColor - uRoomOrigin;

            // dirX=-1.0 表示深入房间；dirZ 为偏角，0.0 表示沿 X 轴直线。
            // 与 usePaintMaterial.js 保持相同设置。
            float dirX = -1.0;
            float dirZ = 0.1; 
            vec3 revealDir = normalize(vec3(dirX, 0.0, dirZ));

            // 将进度映射为沿向量的距离。
            float startDist = -5.0; 
            float endDist = 55.0;
            float targetDist = mix(startDist, endDist, uPaintProgress);
            
            // 像素沿指定方向的距离，相对于房间原点。
            float distFromPlane = targetDist - dot(localPos, revealDir);
            
            // 在垂直于 X 的 YZ 平面采样噪声。
            // 噪声也使用 localPos，使图案保持一致。
            float n = revealNoise(localPos.yz * 2.0) * 2.0;
            float n2 = revealNoise(localPos.yz * 8.0) * 0.5;
            float combinedNoise = n + n2;

            // 用噪声调制边界。
            float boundary = distFromPlane + combinedNoise;

            // 丢弃前留出足够边距，形成不规则边缘。
            if (boundary < 0.0) {
                discard;
            }

            // 创建发光的湿颜料边缘。
            float glow = smoothstep(2.0, 0.0, boundary);
            
            // 提亮边缘，呈现新鲜数字颜料效果。
            if (uPaintProgress < 0.999 && boundary < 2.0) {
                gl_FragColor.rgb += vec3(glow * 0.4, glow * 0.5, glow * 0.7);
            }
            `
        );

        // 保存着色器引用，以便后续更新 uniform。
        materialRef.current.userData.shader = shader;

        // 提供属性时执行初始更新。
        if (props.mapBack && shader.uniforms.mapBack) {
            shader.uniforms.mapBack.value = props.mapBack;
        }
        if (props.mapPainted && shader.uniforms.mapPainted) {
            shader.uniforms.mapPainted.value = props.mapPainted;
        }
    }, [props.mapBack, props.mapPainted, paintProgress, roomOrigin]);

    useImperativeHandle(ref, () => ({
        // bend 的读取与设置接口。
        set bend(value) {
            if (materialRef.current?.userData?.shader) {
                materialRef.current.userData.shader.uniforms.uBend.value = value;
            }
        },
        get bend() {
            return materialRef.current?.userData?.shader?.uniforms.uBend.value || 0;
        },
        // windStrength 的读取与设置接口。
        set windStrength(value) {
            if (materialRef.current?.userData?.shader) {
                materialRef.current.userData.shader.uniforms.uWindStrength.value = value;
            }
        },
        get windStrength() {
            return materialRef.current?.userData?.shader?.uniforms.uWindStrength.value || 0;
        },
        // uProgress 的读取与设置接口。
        set uProgress(value) {
            if (materialRef.current?.userData?.shader) {
                materialRef.current.userData.shader.uniforms.uProgress.value = value;
            }
        },
        get uProgress() {
            return materialRef.current?.userData?.shader?.uniforms.uProgress.value || 0;
        },
        // 需要时也可暴露原始材质。
        material: materialRef.current
    }), []);

    useFrame((state) => {
        if (materialRef.current?.userData?.shader) {
            materialRef.current.userData.shader.uniforms.uTime.value = state.clock.getElapsedTime();
            if (shaderHasUniform(materialRef.current.userData.shader, 'mapBack')) {
                materialRef.current.userData.shader.uniforms.mapBack.value = props.mapBack || null;
            }
            if (shaderHasUniform(materialRef.current.userData.shader, 'mapPainted')) {
                materialRef.current.userData.shader.uniforms.mapPainted.value = props.mapPainted || null;
            }
        }
    });

    // 检查 uniform 是否存在的辅助函数。
    const shaderHasUniform = (shader, name) => shader.uniforms && shader.uniforms[name];

    return (
        <meshBasicMaterial
            ref={materialRef}
            map={map}
            color={color}
            roughness={roughness}
            side={side}
            onBeforeCompile={onBeforeCompile}
            needsUpdate={true}
            {...props}
        />
    );
});

export default PaperMaterial;
