import { useTexture } from '../../../../hooks/useMediaTexture';
import Text from '../../SiteText';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useCursor } from '@react-three/drei';

import * as THREE from 'three';
import { analyzeContentAI } from '../../../../utils/contactValidation';
import { getContactFormIssue } from '../../../../utils/contactDelivery';
import { siteInfo } from '../../../../data/content';

const PAPER_WIDTH = 1.51; // 原始比例 1197/1340。
const PAPER_HEIGHT = 1.7;
const FONT_PATH = '/media/fonts/LXGWWenKaiLite-site.woff';

// 带平滑动画和不可见交互区域的文字输入辅助组件。
const InteractiveTextField = ({
    isActive,
    value,
    placeholder,
    cursor,

    // 布局属性。
    position,
    baseRotation,
    hitboxPosition,
    hitboxSize,

    // 样式属性。
    fontSize,
    maxWidth,
    anchorX = 'left',
    anchorY = 'middle',
    fontPath,
    textAlign,
    lineHeight,

    // 交互。
    onClick
}) => {
    const textRef = useRef();
    const [hovered, setHovered] = useState(false);
    useCursor(hovered, 'text', 'var(--cursor-default)');

    // 动画目标。
    // 悬停时沿 Y 轴轻抬，并绕 Z 轴轻晃。
    const targetY = hovered ? position[1] + 0.007 : position[1];
    const targetRotZ = hovered ? baseRotation[2] + 0.015 : baseRotation[2];

    useFrame((_, delta) => {
        // 平滑插值，让动作柔顺。
        const t = delta * 12; // 速度系数。
        if (textRef.current) {
            textRef.current.position.y = THREE.MathUtils.lerp(textRef.current.position.y, targetY, t);
            textRef.current.rotation.z = THREE.MathUtils.lerp(textRef.current.rotation.z, targetRotZ, t);
        }
    });

    return (
        <group
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onClick={(e) => {
                e.stopPropagation();
                onClick && onClick();
            }}
        >
            {/* 不可见交互区域：colorWrite=false 避免灰色伪影，同时保留射线检测。 */}
            <mesh position={hitboxPosition} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={hitboxSize} />
                <meshBasicMaterial color="#e0e0e0" colorWrite={false} depthWrite={false} />
            </mesh>

            <Text
                renderOrder={1} // 确保文字绘制在纸张上方。
                ref={textRef}
                position={position}
                rotation={baseRotation}
                fontSize={fontSize}
                color={hovered ? '#111111' : '#333333'} // 颜色立即切换，动作保持平滑。
                font={fontPath}
                anchorX={anchorX}
                anchorY={anchorY}
                maxWidth={maxWidth}
                textAlign={textAlign}
                lineHeight={lineHeight}
                overflowWrap="break-word"
            >
                {isActive ? (value + cursor) : (value || placeholder)}
            </Text>
        </group>
    );
};

// 平滑动画按钮辅助组件。
// 平滑动画按钮辅助组件。
const SmoothButton = ({ texture, onClick, position, size, text, fontPath }) => {
    const groupRef = useRef();
    const [hovered, setHovered] = useState(false);
    useCursor(hovered, 'var(--cursor-pointer)', 'var(--cursor-default)');

    // 动画目标，与 InteractiveTextField 风格一致。
    const targetY = hovered ? position[1] + 0.007 : position[1];
    const targetRotZ = hovered ? 0.015 : 0;

    useFrame((_, delta) => {
        const t = delta * 12;
        if (groupRef.current) {
            // 对 Y 位置线性插值。
            groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, t);
            // 对 Z 旋转角（倾斜）线性插值。
            groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRotZ, t);
            // 重置之前可能修改过的缩放。
            groupRef.current.scale.set(1, 1, 1);
        }
    });

    return (
        <group
            ref={groupRef}
            position={position}
            onClick={(e) => {
                e.stopPropagation();
                onClick && onClick();
            }}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
        >
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={size} />
                <meshBasicMaterial color="#e0e0e0"
                    map={texture}
                    transparent
                    alphaTest={0.1}
                />
            </mesh>
            {text && (
                <Text
                    renderOrder={1}
                    position={[0, 0.005, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                    fontSize={0.06}
                    color="#333333"
                    font={fontPath}
                    anchorX="center"
                    anchorY="middle"
                >
                    {text}
                </Text>
            )}
        </group>
    );
};

// 从环境变量读取 Web3Forms API 密钥，避免写入仓库。
// 本地开发在 .env 设置 VITE_WEB3FORMS_KEY，生产环境在 Cloudflare Pages 控制台设置。
const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY || '';

// ═══════════════════════════════════════════════════════════════════════
// 多层反垃圾留言规则。
// 组合使用双字母分析、频率限制和时间陷阱。
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// 基于浏览器 localStorage 的频率限制。
// 同一浏览器每 RATE_LIMIT_MINUTES 分钟最多提交一次。
// localStorage 可被清除，因此只适合作为基础频率限制。
// ═══════════════════════════════════════════════════════════════════════
const RATE_LIMIT_MINUTES = 30;
const RATE_LIMIT_KEY = 'portfolio_contact_rl';

const checkRateLimit = () => {
    try {
        const stored = localStorage.getItem(RATE_LIMIT_KEY);
        if (!stored) return { allowed: true };
        const lastSend = parseInt(stored, 10);
        const elapsed = Date.now() - lastSend;
        const remaining = (RATE_LIMIT_MINUTES * 60 * 1000) - elapsed;
        if (remaining > 0) {
            const mins = Math.ceil(remaining / 60000);
            return { allowed: false, minutesLeft: mins };
        }
        return { allowed: true };
    } catch {
        return { allowed: true }; // localStorage 不可用时允许提交。
    }
};

const recordSubmission = () => {
    try {
        localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString());
    } catch { /* 静默忽略失败。 */ }
};


const MessagePaper = ({ position = [0, 0.05, 2], onSend }) => {
    const groupRef = useRef();
    const paperRef = useRef();
    const backPaperRef = useRef(); // 纸张背面，白色。
    const hiddenInputRef = useRef();
    const emailInputRef = useRef();
    const subjectInputRef = useRef();

    // 表单状态。
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [activeField, setActiveField] = useState(null);
    const [cursorVisible, setCursorVisible] = useState(true);
    const [botcheck, setBotcheck] = useState(''); // 蜜罐状态。
    const formLoadedAt = useRef(Date.now()); // 时间陷阱：记录表单挂载时间。

    // 校验与提交状态。
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null); // 状态为 success 或 error。

    // 邮箱校验辅助函数。
    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    // 表单校验。
    const validateForm = useCallback(() => {
        const newErrors = {};
        if (!email.trim()) newErrors.email = "请填写邮箱";
        else if (!isValidEmail(email)) newErrors.email = "邮箱格式不正确";
        if (!subject.trim()) newErrors.subject = "请填写主题";
        if (!message.trim()) newErrors.message = "请填写留言";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [email, subject, message]);

    // 加载纹理。
    const paperTexture = useTexture('/media/images/textures/contact/paper_form.webp');
    const buttonTexture = useTexture('/media/images/textures/contact/send_button.webp');

    // 配置纹理。
    useEffect(() => {
        if (paperTexture) paperTexture.colorSpace = THREE.SRGBColorSpace;
        if (buttonTexture) buttonTexture.colorSpace = THREE.SRGBColorSpace;
    }, [paperTexture, buttonTexture]);

    // 光标闪烁效果。
    useEffect(() => {
        if (!activeField) {
            setCursorVisible(false);
            return;
        }
        const interval = setInterval(() => setCursorVisible(prev => !prev), 530);
        return () => clearInterval(interval);
    }, [activeField]);

    // 纸张背景点击处理。
    const handlePaperClick = useCallback((e) => {
        e.stopPropagation();
        if (!e.uv) return;
        const uvY = e.uv.y;

        // 未命中交互区域时，按 UV 选择输入字段。
        if (uvY > 0.82) {
            setActiveField('email');
            setTimeout(() => emailInputRef.current?.focus(), 10);
        } else if (uvY > 0.68) {
            setActiveField('subject');
            setTimeout(() => subjectInputRef.current?.focus(), 10);
        } else if (uvY > 0.18) {
            setActiveField('message');
            setTimeout(() => hiddenInputRef.current?.focus(), 10);
        }
    }, []);

    // 处理发送按钮，提交至 Web3Forms。
    const handleButtonClick = useCallback(async () => {
        // 重置此前状态。
        setSubmitStatus(null);

        const deliveryIssue = getContactFormIssue({
            siteUrl: siteInfo.url,
            hostname: window.location.hostname,
            accessKey: WEB3FORMS_KEY,
        });
        if (deliveryIssue) {
            setErrors({ message: deliveryIssue.message });
            return;
        }

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        setErrors({});

        try {
            // 0. 频率限制：每 30 分钟一条留言。
            const rateCheck = checkRateLimit();
            if (!rateCheck.allowed) {
                setErrors({ message: `请等待 ${rateCheck.minutesLeft} 分钟后再发送。` });
                setIsSubmitting(false);
                return;
            }

            // 0b. 时间陷阱：需停留超过 3 秒。
            const timeOnForm = Date.now() - formLoadedAt.current;
            if (timeOnForm < 3000) {
                setErrors({ message: '请稍等一下再发送。' });
                setIsSubmitting(false);
                return;
            }

            // 1. 蜜罐检查，静默拦截。
            if (botcheck) {
                setErrors({ message: '留言暂时无法发送，请稍后再试。' });
                setIsSubmitting(false);
                return;
            }

            // 2. 留言内容规则校验。
            const subjectAnalysis = analyzeContentAI(subject, true);
            const messageAnalysis = analyzeContentAI(message, false);

            if (subjectAnalysis.isSpam || messageAnalysis.isSpam) {
                setErrors({ message: "留言内容似乎无效，请补充清晰的信息。" });
                setIsSubmitting(false);
                return;
            }

            // 3. 通过 DoH 校验邮箱域名的 MX 记录。
            const domain = email.split('@')[1];
            if (domain) {
                try {
                    const dnsRes = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=MX`, {
                        headers: { 'Accept': 'application/dns-json' }
                    });
                    const dnsData = await dnsRes.json();
                    
                    // 状态 0 为 NOERROR；没有类型 15 的 MX 记录时，域名无法接收邮件。
                    // 状态 3 为 NXDOMAIN，表示域名不存在。
                    if (dnsData.Status === 3 || (dnsData.Status === 0 && (!dnsData.Answer || !dnsData.Answer.some(a => a.type === 15)))) {
                        setErrors({ email: "邮箱域名不存在或无法接收邮件。" });
                        setIsSubmitting(false);
                        return;
                    }
                } catch (dnsErr) {
                    console.warn("邮箱域名检查暂不可用，继续提交。", dnsErr);
                }
            }

            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    access_key: WEB3FORMS_KEY,
                    from_name: `${siteInfo.siteTitle} 站内留言`,
                    email: email,
                    subject: subject,
                    message: message
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setSubmitStatus('success');
                recordSubmission(); // 记录提交时间，用于频率限制。
                onSend?.({ message, email, subject });

                // 成功后清空表单。
                setMessage('');
                setEmail('');
                setSubject('');
                formLoadedAt.current = Date.now(); // 重置时间陷阱。
            } else {
                throw new Error(result.message || "发送失败");
            }
        } catch {
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    }, [message, email, subject, botcheck, onSend, validateForm]);

    // 输入处理函数。
    const handleMessageInput = useCallback((e) => {
        if (e.target.value.length <= 300) setMessage(e.target.value);
    }, []);
    const handleEmailInput = useCallback((e) => {
        if (e.target.value.length <= 50) setEmail(e.target.value);
    }, []);
    const handleSubjectInput = useCallback((e) => {
        if (e.target.value.length <= 50) setSubject(e.target.value);
    }, []);
    const handleBotcheckInput = useCallback((e) => {
        setBotcheck(e.target.checked);
    }, []);

    const handleBlur = useCallback(() => {
        setTimeout(() => {
            const active = document.activeElement;
            if (active !== hiddenInputRef.current &&
                active !== emailInputRef.current &&
                active !== subjectInputRef.current) {
                setActiveField(null);
            }
        }, 100);
    }, []);

    // 保存原始顶点位置，用于折纸动画。
    // 纸张轻摆动画。
    useFrame((state) => {
        if (!paperRef.current) return;

        const time = state.clock.getElapsedTime();

        // 轻摆动画。
        paperRef.current.rotation.z = Math.sin(time * 0.5) * 0.005;
    });

    return (
        <group ref={groupRef} position={position}>
            {/* 隐藏的 HTML 输入框。 */}
            <Html position={[0, 0, 0]} style={{ position: 'fixed', left: '-9999px', top: '-9999px', opacity: 0, pointerEvents: 'none' }}>
                <textarea ref={hiddenInputRef} value={message} onChange={handleMessageInput} onBlur={handleBlur} aria-label="留言" style={{ pointerEvents: 'auto' }} />
                <input ref={emailInputRef} type="email" value={email} onChange={handleEmailInput} onBlur={handleBlur} aria-label="邮箱" style={{ pointerEvents: 'auto' }} />
                <input ref={subjectInputRef} type="text" value={subject} onChange={handleSubjectInput} onBlur={handleBlur} aria-label="主题" style={{ pointerEvents: 'auto' }} />
                <input type="checkbox" name="botcheck" checked={botcheck} onChange={handleBotcheckInput} style={{ pointerEvents: 'auto' }} />
            </Html>

            {/* 信纸正面网格，带纹理。 */}
            <mesh ref={paperRef} rotation={[-Math.PI / 2, 0, 0]} onClick={handlePaperClick}>
                <planeGeometry args={[PAPER_WIDTH, PAPER_HEIGHT, 20, 20]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={paperTexture}
                    transparent
                    alphaTest={0.5}
                    side={THREE.FrontSide}
                    roughness={0.9}
                />
            </mesh>

            {/* 白色信纸背面。 */}
            <mesh ref={backPaperRef} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[PAPER_WIDTH, PAPER_HEIGHT, 20, 20]} />
                <meshBasicMaterial
                    color="#f5f5f0"
                    side={THREE.BackSide}
                    roughness={0.9}
                />
            </mesh>

            {/* 交互输入字段。 */}
            <>
                <InteractiveTextField
                    isActive={activeField === 'email'}
                    value={email}
                    placeholder="填写邮箱……"
                    cursor={cursorVisible ? '|' : ' '}
                    onClick={() => { setActiveField('email'); setTimeout(() => emailInputRef.current?.focus(), 10); }}
                    // 布局。
                    position={[-0.5, 0.008, -0.61]}
                    baseRotation={[-Math.PI / 2, 0, 0.02]}
                    hitboxPosition={[0, 0.005, -0.61]}
                    hitboxSize={[PAPER_WIDTH * 0.85, 0.08]}
                    // 样式。
                    fontSize={0.05}
                    maxWidth={PAPER_WIDTH * 0.8}
                    fontPath={FONT_PATH}
                />

                {/* 主题字段。 */}
                <InteractiveTextField
                    isActive={activeField === 'subject'}
                    value={subject}
                    placeholder="填写主题……"
                    cursor={cursorVisible ? '|' : ' '}
                    onClick={() => { setActiveField('subject'); setTimeout(() => subjectInputRef.current?.focus(), 10); }}
                    // 布局。
                    position={[-0.5, 0.008, -0.46]}
                    baseRotation={[-Math.PI / 2, 0, 0.02]}
                    hitboxPosition={[0, 0.005, -0.46]}
                    hitboxSize={[PAPER_WIDTH * 0.85, 0.08]}
                    // 样式。
                    fontSize={0.05}
                    maxWidth={PAPER_WIDTH * 0.8}
                    fontPath={FONT_PATH}
                />

                {/* 留言字段。 */}
                <InteractiveTextField
                    isActive={activeField === 'message'}
                    value={message}
                    placeholder="写下留言……"
                    cursor={cursorVisible ? '|' : ' '}
                    onClick={() => { setActiveField('message'); setTimeout(() => hiddenInputRef.current?.focus(), 10); }}
                    // 布局。
                    position={[-0.46, 0.008, -0.3]}
                    baseRotation={[-Math.PI / 2, 0, 0.02]}
                    hitboxPosition={[0, 0.005, 0.1]}
                    hitboxSize={[PAPER_WIDTH * 0.85, 0.55]}
                    // 样式。
                    fontSize={message.length > 180 ? 0.035 : 0.045}
                    maxWidth={PAPER_WIDTH * 0.75}
                    fontPath={FONT_PATH}
                    anchorY="top"
                    textAlign="left"
                    lineHeight={1.35}
                />

                {/* 发送按钮。 */}
                <SmoothButton
                    texture={buttonTexture}
                    onClick={handleButtonClick}
                    position={[0, 0.005, 0.68]}
                    size={[0.5, 0.13]}
                    text={isSubmitting ? "发送中……" : "发送"}
                    fontPath={FONT_PATH}
                />

                {/* 校验错误。 */}
                {Object.keys(errors).length > 0 && (
                    <Text
                        position={[0, 0.01, 0.55]}
                        rotation={[-Math.PI / 2, 0, 0]}
                        fontSize={0.035}
                        color="#cc3333"
                        font={FONT_PATH}
                        anchorX="center"
                        anchorY="middle"
                    >
                        {errors.email || errors.subject || errors.message || "请填写所有内容"}
                    </Text>
                )}

                {/* 成功提示。 */}
                {submitStatus === 'success' && (
                    <Text
                        position={[0, 0.02, 0.55]}
                        rotation={[-Math.PI / 2, 0, 0]}
                        fontSize={0.045}
                        color="#22aa44"
                        font={FONT_PATH}
                        anchorX="center"
                        anchorY="middle"
                    >
                        留言已发送！✓
                    </Text>
                )}

                {/* 错误提示。 */}
                {submitStatus === 'error' && (
                    <Text
                        position={[0, 0.02, 0.55]}
                        rotation={[-Math.PI / 2, 0, 0]}
                        fontSize={0.04}
                        color="#cc3333"
                        font={FONT_PATH}
                        anchorX="center"
                        anchorY="middle"
                    >
                        发送失败，请重试。
                    </Text>
                )}
            </>
        </group>
    );
};

export default MessagePaper;
