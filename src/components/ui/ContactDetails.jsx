import { useEffect, useRef, useState } from 'react';
import { useScene } from '../../context/SceneContext';
import { contactInfo, siteInfo, resumeInfo, frequentlyAskedQuestions } from '../../data/content';
import StudioChannels from './StudioChannels';
import '../../styles/AboutProfile.scss';
import '../../styles/ContactDetails.scss';

export default function ContactDetails() {
    const { currentRoom, hasEntered, isInRoom, isTeleporting, overlayContent, openOverlay, closeOverlay } = useScene();
    const dialogRef = useRef(null);
    const wechatRef = useRef(null);
    const [copyStatus, setCopyStatus] = useState('');
    const isOpen = overlayContent?.layout === 'contact';
    const focusWechat = overlayContent?.target === 'wechat';
    const messageFormConfigured = Boolean(import.meta.env.VITE_WEB3FORMS_KEY);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (isOpen && !dialog.open) dialog.showModal();
        if (!isOpen && dialog.open) dialog.close();
        if (isOpen && focusWechat) wechatRef.current?.focus();
    }, [isOpen, focusWechat]);

    const closeContact = () => {
        setCopyStatus('');
        closeOverlay();
    };

    const copyWechat = async () => {
        try {
            await navigator.clipboard.writeText(contactInfo.wechatId);
            setCopyStatus('微信号已复制，可以到微信添加好友。');
        } catch {
            wechatRef.current?.focus();
            wechatRef.current?.select();
            setCopyStatus('微信号已选中，可以长按或使用复制快捷键。');
        }
    };

    return <>
        {hasEntered && isInRoom && currentRoom === 'contact' && !isTeleporting && (
            <button
                type="button"
                className="about-profile-trigger contact-details-trigger"
                aria-haspopup="dialog"
                aria-controls="contact-details-dialog"
                onClick={() => openOverlay({ layout: 'contact' })}
            >
                联系方式
            </button>
        )}
        <dialog
            ref={dialogRef}
            id="contact-details-dialog"
            className="about-profile-dialog contact-details-dialog"
            aria-labelledby="contact-details-title"
            onCancel={closeContact}
            onClose={closeContact}
            onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }}
            onClick={event => { if (event.target === event.currentTarget) closeContact(); }}
        >
            {isOpen && (
                <div className="about-profile-paper">
                    <header className="about-profile-header">
                        <h2 id="contact-details-title">{contactInfo.title}</h2>
                        <button type="button" className="studio-close-btn" aria-label="关闭联系方式" onClick={closeContact}>
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <line x1="6" y1="6" x2="18" y2="18" />
                                <line x1="6" y1="18" x2="18" y2="6" />
                            </svg>
                        </button>
                    </header>
                    <div className="about-profile-body contact-details-body">
                        <p>{contactInfo.description}</p>
                        <ul className="profile-keywords" aria-label="欢迎这些联系">
                            {contactInfo.topics.map(topic => <li key={topic}>{topic}</li>)}
                        </ul>
                        {resumeInfo?.url && (
                            <section className="contact-resume" aria-labelledby="contact-resume-title">
                                <h3 id="contact-resume-title">{resumeInfo.title}</h3>
                                <p>{resumeInfo.description}</p>
                                <div className="contact-resume-actions">
                                    <a href={resumeInfo.url} target="_blank" rel="noopener noreferrer">在线查看 PDF</a>
                                    <a href={resumeInfo.url} download={resumeInfo.downloadName}>下载简历 PDF</a>
                                </div>
                            </section>
                        )}
                        <dl className="contact-addresses">
                            <div>
                                <dt>邮箱</dt>
                                <dd><a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a></dd>
                            </div>
                            <div>
                                <dt>GitHub</dt>
                                <dd><a href={siteInfo.githubUrl} target="_blank" rel="noopener noreferrer">{siteInfo.githubUrl.replace(/^https?:\/\//, '')}</a></dd>
                            </div>
                            <div>
                                <dt><label htmlFor="contact-wechat">微信</label></dt>
                                <dd>
                                    <div className="contact-wechat">
                                        <input id="contact-wechat" ref={wechatRef} value={contactInfo.wechatId} readOnly spellCheck={false} />
                                        <button type="button" onClick={copyWechat}>复制微信号</button>
                                    </div>
                                    <p className="contact-copy-status" role="status" aria-live="polite">{copyStatus}</p>
                                </dd>
                            </div>
                        </dl>
                        {contactInfo.showMessageForm && (
                            <p className="contact-message-note">{messageFormConfigured
                                ? '也可以点击海面上的「写留言」，给我留一封信。'
                                : '站内留言入口已保留，暂时请通过邮箱或微信联系我。'}</p>
                        )}
                        <StudioChannels />
                        <section className="contact-faq" aria-labelledby="contact-faq-title">
                            <h3 id="contact-faq-title">随便聊聊</h3>
                            {frequentlyAskedQuestions.map(item => (
                                <details key={item.id}>
                                    <summary>{item.question}</summary>
                                    {item.answer.split(/\n\n+/).map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                                </details>
                            ))}
                        </section>
                    </div>
                </div>
            )}
        </dialog>
    </>;
}
