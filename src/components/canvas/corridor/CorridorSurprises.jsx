import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Html, useCursor } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, Quaternion, Vector3 } from 'three';
import { useActiveFrame } from '../../../hooks/useActiveFrame';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { useScene } from '../../../context/contexts';
import { CorridorActivityContext } from '../../../context/CorridorActivityContext';
import Text from '../SiteText';
import '../../../styles/CorridorSurprises.scss';

// 三维点击区域保留至少 44px；原生按钮在键盘聚焦时显示。
const SurpriseTarget = ({ name, label, hint, annotation, message, width, height, position, onActivate, expanded, children }) => {
    const root = useRef();
    const hitArea = useRef();
    const inViewRef = useRef(false);
    const [inView, setInView] = useState(false);
    const [hovered, setHovered] = useState(false);
    const activity = useContext(CorridorActivityContext);
    const { hasEntered, isInRoom, isTeleporting, loadingRoom, overlayContent } = useScene();
    const enabled = hasEntered && !isInRoom && !isTeleporting && !loadingRoom && !overlayContent;
    const [projection] = useState(() => ({ point: new Vector3(), rotation: new Quaternion() }));

    useCursor(hovered && inView && enabled, 'var(--cursor-pointer)', 'var(--cursor-default)');

    useFrame(({ camera, size }) => {
        if (!root.current || !hitArea.current) return;
        root.current.getWorldPosition(projection.point);
        projection.point.applyMatrix4(camera.matrixWorldInverse);
        const depth = -projection.point.z;
        const minimum = 2 * depth * Math.tan(camera.fov * Math.PI / 360) * 44 / size.height;
        hitArea.current.scale.set(Math.max(width, minimum), Math.max(height, minimum), 1);
        root.current.getWorldQuaternion(projection.rotation);
        hitArea.current.quaternion.copy(projection.rotation).invert().multiply(camera.quaternion);

        projection.point.applyMatrix4(camera.projectionMatrix);
        const visible = Boolean(enabled && (!activity || activity.current) && depth > 0 && depth < 12
            && Math.abs(projection.point.x) < 1 && Math.abs(projection.point.y) < 1);
        if (visible !== inViewRef.current) {
            inViewRef.current = visible;
            setInView(visible);
        }
    });

    const activate = event => {
        if (!enabled || !inViewRef.current || event.delta > 6 || event.button > 0) return;
        event.stopPropagation();
        onActivate();
    };

    return (
        <group ref={root} name={name} position={position}>
            {children}
            <mesh
                ref={hitArea}
                name={`${name}-target`}
                position={[0, 0, 0.06]}
                onClick={activate}
                onPointerOver={event => {
                    if (!enabled || !inViewRef.current) return;
                    event.stopPropagation();
                    setHovered(true);
                }}
                onPointerOut={() => setHovered(false)}
            >
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} side={DoubleSide} />
            </mesh>
            {inView && enabled && (
                <Html center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }} calculatePosition={(object, camera, size) => {
                    projection.point.setFromMatrixPosition(object.matrixWorld).project(camera);
                    const margin = annotation ? 82 : 116;
                    const rightMargin = size.width >= 640 && annotation
                        ? (annotation === 'plane' ? 235 : 132)
                        : margin;
                    const topMargin = annotation === 'plane' ? (size.width >= 640 ? 168 : 128) : 0;
                    return [
                        Math.max(margin, Math.min(size.width - rightMargin, (projection.point.x + 1) * size.width / 2)),
                        Math.max(topMargin, Math.min(size.height - 100, (1 - projection.point.y) * size.height / 2)),
                    ];
                }}>
                    <div className={`corridor-surprise${annotation ? ` corridor-surprise--${annotation}` : ''}`}>
                        <button type="button" className="corridor-surprise-control" onClick={activate} aria-expanded={expanded} onKeyDown={event => {
                            if (event.key === ' ' || event.key === 'Enter') event.stopPropagation();
                        }}>
                            {label}
                        </button>
                        <span
                            className={`corridor-surprise-message${annotation ? ' corridor-surprise-annotation' : ''}${message || hovered ? ' is-visible' : ''}`}
                            role={message ? 'status' : undefined}
                            aria-hidden={message || hovered ? undefined : true}
                        >
                            {annotation && (
                                <svg className="corridor-surprise-leader" viewBox="0 0 66 70" fill="none" aria-hidden="true">
                                    <path d={annotation === 'plane'
                                        ? 'M62 6C28 9 40 48 4 64M4 64L13 63M4 64L8 56'
                                        : 'M5 8C2 31 22 38 59 33'} />
                                </svg>
                            )}
                            {message || hint || label}
                        </span>
                    </div>
                </Html>
            )}
        </group>
    );
};

export const PaperPlaneTrick = ({ position, children, width, height }) => {
    const motion = useRef();
    const action = useRef({ clicks: 0, lastClick: 0, elapsed: -1, nudge: 0 });
    const [message, setMessage] = useState('');
    const reducedMotion = useReducedMotion();

    useEffect(() => {
        if (!message) return;
        const timer = setTimeout(() => setMessage(''), 1600);
        return () => clearTimeout(timer);
    }, [message]);

    useActiveFrame((_, delta) => {
        if (!motion.current) return;
        const state = action.current;
        if (state.elapsed >= 0) {
            state.elapsed = Math.min(0.95, state.elapsed + delta);
            const progress = state.elapsed / 0.95;
            const angle = Math.PI * 2 * (1 - Math.pow(1 - progress, 3));
            motion.current.rotation.z = reducedMotion ? 0 : -angle;
            motion.current.position.set(
                reducedMotion ? 0 : Math.sin(angle) * 0.12,
                reducedMotion ? 0 : (1 - Math.cos(angle)) * 0.16,
                0
            );
            if (progress === 1) {
                state.elapsed = -1;
                motion.current.rotation.z = 0;
                motion.current.position.set(0, 0, 0);
            }
        } else if (state.nudge > 0) {
            state.nudge = Math.max(0, state.nudge - delta);
            motion.current.rotation.z = reducedMotion ? 0 : Math.sin(state.nudge / 0.22 * Math.PI) * -0.12;
        }
    });

    const activate = () => {
        const state = action.current;
        if (state.elapsed >= 0) return;
        const now = performance.now();
        state.clicks = now - state.lastClick < 1400 ? state.clicks + 1 : 1;
        state.lastClick = now;
        state.nudge = 0.22;
        if (state.clicks < 3) {
            setMessage(state.clicks === 1 ? '再点两下？' : '再点一下！');
            return;
        }
        state.clicks = 0;
        state.nudge = 0;
        state.elapsed = 0;
        setMessage(reducedMotion ? '准备起飞' : '飞一圈');
    };

    return (
        <SurpriseTarget name="corridor-paper-plane" label="连点三下纸飞机" hint="试着点三下" annotation="plane" message={message} width={width} height={height} position={position} onActivate={activate}>
            <group ref={motion} name="paper-plane-trick">{children}</group>
        </SurpriseTarget>
    );
};

export const CoffeeSteam = ({ position, children, width, height }) => {
    const steam = useRef();
    const elapsed = useRef(-1);
    const reducedMotion = useReducedMotion();
    const [message, setMessage] = useState('');
    const strokes = useMemo(() => [0, 1, 2].map(index => {
        const points = new Float32Array(25 * 3);
        for (let point = 0; point < 25; point++) {
            const progress = point / 24;
            points[point * 3] = Math.sin(progress * Math.PI * 2 + index) * 0.016;
            points[point * 3 + 1] = progress * 0.24;
        }
        return points;
    }), []);

    useActiveFrame((_, delta) => {
        if (!steam.current || elapsed.current < 0) return;
        elapsed.current += delta;
        const time = elapsed.current;
        steam.current.visible = time < 2.2;
        steam.current.children.forEach((line, index) => {
            const rise = (time * 0.7 + index / 3) % 1;
            line.position.y = reducedMotion ? 0 : rise * 0.16;
            line.position.x = (index - 1) * 0.055 + (reducedMotion ? 0 : Math.sin(time * 2 + index) * 0.012);
            line.material.opacity = Math.min(1, time * 7) * Math.max(0, 1 - time / 2.2) * 0.65;
        });
        if (time >= 2.2) {
            elapsed.current = -1;
            setMessage('');
        }
    });

    return (
        <SurpriseTarget name="corridor-coffee" label="点点咖啡杯" hint="点点杯子" annotation="coffee" message={message} width={width} height={height} position={position} onActivate={() => {
            elapsed.current = 0;
            setMessage('还热着');
        }}>
            {children}
            <group ref={steam} name="coffee-steam" position={[0.02, height * 0.32, 0.03]} visible={false}>
                {strokes.map((points, index) => (
                    <line key={index}>
                        <bufferGeometry><bufferAttribute attach="attributes-position" args={[points, 3]} /></bufferGeometry>
                        <lineBasicMaterial color="#6b665b" transparent opacity={0} depthWrite={false} />
                    </line>
                ))}
            </group>
        </SurpriseTarget>
    );
};

export const HiddenNote = ({ position }) => {
    const paper = useRef();
    const [opened, setOpened] = useState(false);
    const reducedMotion = useReducedMotion();
    const outline = useMemo(() => new Float32Array([
        -0.3, -0.19, 0.005, 0.3, -0.18, 0.005, 0.31, 0.09, 0.005,
        0.22, 0.19, 0.005, -0.31, 0.18, 0.005
    ]), []);
    const fold = useMemo(() => new Float32Array([0.21, 0.19, 0.008, 0.21, 0.09, 0.008, 0.31, 0.09, 0.008]), []);

    useActiveFrame((_, delta) => {
        if (!paper.current) return;
        const blend = reducedMotion ? 1 : 1 - Math.exp(-12 * delta);
        const targetScale = opened ? 1.7 : 1;
        const nextScale = paper.current.scale.x + (targetScale - paper.current.scale.x) * blend;
        paper.current.scale.setScalar(nextScale);
        paper.current.rotation.z += ((opened ? 0 : -0.14) - paper.current.rotation.z) * blend;
        paper.current.position.y += ((opened ? -0.16 : 0) - paper.current.position.y) * blend;
    });

    return (
        <SurpriseTarget name="corridor-hidden-note" label={opened ? '收起画框下的小纸条' : '打开画框下的小纸条'} message={opened ? '被你找到啦。愿今天也有一点小惊喜。' : ''} width={0.64} height={0.4} position={position} onActivate={() => setOpened(value => !value)} expanded={opened}>
            <group ref={paper} name="hidden-note-paper" rotation={[0, 0, -0.14]}>
                <mesh>
                    <planeGeometry args={[0.62, 0.38]} />
                    <meshBasicMaterial color="#f6e8c7" side={DoubleSide} />
                </mesh>
                <lineLoop>
                    <bufferGeometry><bufferAttribute attach="attributes-position" args={[outline, 3]} /></bufferGeometry>
                    <lineBasicMaterial color="#746854" />
                </lineLoop>
                <mesh>
                    <bufferGeometry><bufferAttribute attach="attributes-position" args={[fold, 3]} /></bufferGeometry>
                    <meshBasicMaterial color="#d8c6a0" side={DoubleSide} />
                </mesh>
                <Text position={[0, -0.015, 0.015]} fontSize={opened ? 0.055 : 0.065} color="#4b4439" textAlign="center" anchorX="center" anchorY="middle" maxWidth={0.55}>
                    {opened ? '被你找到啦。\n愿今天也有一点小惊喜。' : '致好奇的你'}
                </Text>
            </group>
        </SurpriseTarget>
    );
};
