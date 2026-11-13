import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Html, useCursor } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { DoubleSide, Quaternion, Shape, Vector3 } from 'three';
import { useActiveFrame } from '../../../hooks/useActiveFrame';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { useScene, useSecrets } from '../../../context/contexts';
import { CorridorActivityContext } from '../../../context/CorridorActivityContext';
import { SECRET_IDS } from '../../../data/secrets';
import '../../../styles/CorridorSurprises.scss';

// 三维点击区域保留至少 44px；原生按钮在键盘聚焦时显示。
export const SurpriseTarget = ({ name, label, hint, annotation, message, showCaption = true, hintDistance = 0, attentionRef, width, height, position, onActivate, expanded, children }) => {
    const root = useRef();
    const hitArea = useRef();
    const touch = useRef(null);
    const lastTouch = useRef(-Infinity);
    const inViewRef = useRef(false);
    const nearbyRef = useRef(false);
    const [inView, setInView] = useState(false);
    const [nearby, setNearby] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const activity = useContext(CorridorActivityContext);
    const { hasEntered, isInRoom, isTeleporting, loadingRoom, overlayContent } = useScene();
    const enabled = hasEntered && !isInRoom && !isTeleporting && !loadingRoom && !overlayContent;
    const [projection] = useState(() => ({ point: new Vector3(), rotation: new Quaternion() }));

    useCursor(hovered && inView && enabled, 'var(--cursor-pointer)', 'var(--cursor-default)');

    useFrame(({ camera, size }) => {
        if (!root.current || !hitArea.current) return;
        root.current.getWorldPosition(projection.point);
        const distance = projection.point.distanceTo(camera.position);
        projection.point.applyMatrix4(camera.matrixWorldInverse);
        const depth = -projection.point.z;
        const minimum = 2 * depth * Math.tan(camera.fov * Math.PI / 360) * 44 / size.height;
        hitArea.current.scale.set(Math.max(width, minimum), Math.max(height, minimum), 1);
        root.current.getWorldQuaternion(projection.rotation);
        hitArea.current.quaternion.copy(projection.rotation).invert().multiply(camera.quaternion);
        hitArea.current.position.set(0, 0, 0.08).applyQuaternion(hitArea.current.quaternion);

        projection.point.applyMatrix4(camera.projectionMatrix);
        const visible = Boolean(enabled && (!activity || activity.current) && depth > 0 && depth < 12
            && Math.abs(projection.point.x) < 1 && Math.abs(projection.point.y) < 1);
        if (visible !== inViewRef.current) {
            inViewRef.current = visible;
            setInView(visible);
        }
        const near = visible && hintDistance > 0 && distance < hintDistance;
        if (near !== nearbyRef.current) {
            nearbyRef.current = near;
            setNearby(near);
        }
        if (attentionRef) {
            attentionRef.current.visible = visible;
            attentionRef.current.nearby = near;
            attentionRef.current.engaged = visible && (hovered || focused);
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
                onClick={event => {
                    if (performance.now() - lastTouch.current < 700) return;
                    activate(event);
                }}
                onPointerDown={event => {
                    if (event.pointerType !== 'touch') return;
                    touch.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
                    event.target.setPointerCapture(event.pointerId);
                }}
                onPointerMove={event => {
                    const gesture = touch.current;
                    if (gesture && gesture.id === event.pointerId && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 6) gesture.moved = true;
                }}
                onPointerUp={event => {
                    if (event.pointerType !== 'touch') return;
                    const gesture = touch.current;
                    touch.current = null;
                    lastTouch.current = performance.now();
                    event.target.releasePointerCapture(event.pointerId);
                    if (gesture && gesture.id === event.pointerId && !gesture.moved) activate(event);
                }}
                onPointerCancel={() => { touch.current = null; }}
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
                    const margin = annotation === 'corner'
                        ? Math.min(248, size.width - 132) + 112
                        : annotation ? 82 : 116;
                    const rightMargin = annotation === 'corner' ? 12 : size.width >= 640 && annotation
                        ? (annotation === 'plane' ? 235 : 132)
                        : margin;
                    const topMargin = annotation === 'plane' ? (size.width >= 640 ? 168 : 128) : 0;
                    return [
                        Math.max(margin, Math.min(size.width - rightMargin, (projection.point.x + 1) * size.width / 2)),
                        Math.max(topMargin, Math.min(size.height - 100, (1 - projection.point.y) * size.height / 2)),
                    ];
                }}>
                    <div className={`corridor-surprise${annotation ? ` corridor-surprise--${annotation}` : ''}`}>
                        <button type="button" className="corridor-surprise-control" onClick={activate} aria-expanded={expanded} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onKeyDown={event => {
                            if (event.key === ' ' || event.key === 'Enter') event.stopPropagation();
                        }}>
                            {label}
                        </button>
                        <span
                            className={showCaption ? `corridor-surprise-message${annotation ? ' corridor-surprise-annotation' : ''}${message || hovered || focused || nearby ? ' is-visible' : ''}` : 'sr-only'}
                            role={message ? 'status' : undefined}
                            aria-hidden={message || hovered || focused || nearby ? undefined : true}
                        >
                            {showCaption && annotation && (
                                <svg className="corridor-surprise-leader" viewBox="0 0 66 70" fill="none" aria-hidden="true">
                                    <path d={annotation === 'plane'
                                        ? 'M62 6C28 9 40 48 4 64M4 64L13 63M4 64L8 56'
                                        : annotation === 'corner'
                                            ? 'M7 10C29 4 48 29 55 57M55 57L46 48M55 57L58 44'
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
    const { discoverSecret } = useSecrets();

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
        discoverSecret(SECRET_IDS.plane);
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
    const { discoverSecret } = useSecrets();
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
            discoverSecret(SECRET_IDS.coffee);
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

export const HiddenFrameCorner = ({ position }) => {
    const narrowViewport = useThree(state => state.size.width < 640);
    const paper = useRef();
    const imprint = useRef();
    const sparkles = useRef();
    const attention = useRef({ visible: false, nearby: false, engaged: false });
    const cueElapsed = useRef(0);
    const revealElapsed = useRef(1);
    const progress = useRef(0);
    const [opened, setOpened] = useState(false);
    const [message, setMessage] = useState('');
    const reducedMotion = useReducedMotion();
    const { discovered, discoverSecret } = useSecrets();
    const isDiscovered = discovered.includes(SECRET_IDS.note);
    const [detail] = useState(() => {
        const star = new Shape().moveTo(0, 0.04).lineTo(0.009, 0.009).lineTo(0.03, 0)
            .lineTo(0.009, -0.009).lineTo(0, -0.04).lineTo(-0.009, -0.009)
            .lineTo(-0.03, 0).lineTo(-0.009, 0.009).closePath();
        return {
            axis: new Vector3(1, 1, 0).normalize(), rotation: new Quaternion(), star,
            triangle: new Float32Array([-0.1, -0.1, 0, 0.1, -0.1, 0, 0.1, 0.1, 0]),
            crease: new Float32Array([-0.1, -0.1, 0.002, 0.1, 0.1, 0.002]),
            outline: new Float32Array(star.getPoints().flatMap(point => [point.x, point.y, 0.003])),
        };
    });

    useEffect(() => {
        if (!message) return;
        const timer = setTimeout(() => setMessage(''), 3200);
        return () => clearTimeout(timer);
    }, [message]);

    useActiveFrame((_, delta) => {
        if (!paper.current || !imprint.current || !attention.current.visible) return;
        const { nearby, engaged } = attention.current;
        cueElapsed.current = nearby && !opened && !isDiscovered ? cueElapsed.current + delta : 0;
        const phase = cueElapsed.current % 5;
        const lift = phase < 1.2 ? Math.pow(Math.sin(phase / 1.2 * Math.PI), 2) * 0.3 : 0;
        const peek = engaged ? 0.55 : nearby ? 0.18 + (reducedMotion ? 0 : lift) : 0;
        const target = opened ? 1 : 0;
        const next = reducedMotion ? target : progress.current + (target - progress.current) * (1 - Math.exp(-12 * delta));
        progress.current = Math.abs(next - target) < 0.001 ? target : next;
        const angle = -2.5 * progress.current - peek * (1 - progress.current);
        paper.current.quaternion.slerp(
            detail.rotation.setFromAxisAngle(detail.axis, angle),
            reducedMotion ? 1 : 1 - Math.exp(-14 * delta)
        );
        revealElapsed.current = Math.min(1, revealElapsed.current + delta / 0.85);
        const bloom = reducedMotion ? 0 : Math.sin(revealElapsed.current * Math.PI) * 0.12;
        imprint.current.visible = progress.current > 0.12;
        imprint.current.scale.setScalar((0.55 + progress.current * 1.55) * (1 + bloom));
        sparkles.current.scale.setScalar(reducedMotion ? 1 : 1 + bloom * 2);
    });

    return (
        <SurpriseTarget name="corridor-hidden-note" label={opened ? '合上画纸折角' : '翻开画纸折角'} hint={opened ? '再点一下，轻轻合好' : '这角纸，好像能翻开'} annotation="corner" message={message ? <>{message}<small>画角的小星光 · 已记入探索手记</small></> : ''} hintDistance={!opened && !isDiscovered ? (narrowViewport ? 12 : 8) : 0} attentionRef={attention} width={0.26} height={0.26} position={position} onActivate={() => {
            if (!opened) {
                discoverSecret(SECRET_IDS.note);
                revealElapsed.current = 0;
                setMessage(isDiscovered ? '小星光还在这里' : '发现了一个小秘密');
            } else {
                setMessage('');
            }
            setOpened(value => !value);
        }} expanded={opened}>
            <group ref={imprint} name="frame-corner-imprint" position={[-0.075, 0.075, 0.012]} scale={0.55} visible={false}>
                <mesh>
                    <shapeGeometry args={[detail.star]} />
                    <meshBasicMaterial color="#d5b874" side={DoubleSide} toneMapped={false} />
                </mesh>
                <line>
                    <bufferGeometry><bufferAttribute attach="attributes-position" args={[detail.outline, 3]} /></bufferGeometry>
                    <lineBasicMaterial color="#958367" transparent opacity={0.6} />
                </line>
                <group ref={sparkles} name="frame-corner-sparkles">
                    {[[-0.035, 0.063, 0.2], [0.015, 0.09, 0.15]].map(([x, y, scale]) => (
                        <mesh key={x} position={[x, y, 0]} scale={scale}>
                            <shapeGeometry args={[detail.star]} />
                            <meshBasicMaterial color="#b99b5f" side={DoubleSide} toneMapped={false} />
                        </mesh>
                    ))}
                </group>
            </group>
            <group ref={paper} name="frame-corner-fold" position={[-0.1, 0.1, 0.02]}>
                <mesh>
                    <bufferGeometry><bufferAttribute attach="attributes-position" args={[detail.triangle, 3]} /></bufferGeometry>
                    <meshBasicMaterial color="#e4e1d6" side={DoubleSide} />
                </mesh>
                <line>
                    <bufferGeometry><bufferAttribute attach="attributes-position" args={[detail.crease, 3]} /></bufferGeometry>
                    <lineBasicMaterial color="#8d887b" transparent opacity={0.4} />
                </line>
            </group>
        </SurpriseTarget>
    );
};
