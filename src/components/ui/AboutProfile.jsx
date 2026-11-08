import { useEffect, useRef } from 'react';
import { useScene } from '../../context/SceneContext';
import { personalProfile, resumeInfo } from '../../data/content';
import { getProfileSections } from '../../data/profile.js';
import ProfileContent from './ProfileContent';
import '../../styles/AboutProfile.scss';

export default function AboutProfile() {
    const { currentRoom, hasEntered, isInRoom, isTeleporting, overlayContent, openOverlay, closeOverlay } = useScene();
    const dialogRef = useRef(null);
    const bodyRef = useRef(null);
    const isOpen = overlayContent?.layout === 'profile';
    const section = overlayContent?.section;
    const sections = getProfileSections(personalProfile);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (isOpen && !dialog.open) dialog.showModal();
        if (!isOpen && dialog.open) dialog.close();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const frame = requestAnimationFrame(() => {
            const target = section && document.getElementById(`profile-${section}`);
            if (target) target.scrollIntoView({ block: 'start' });
            else if (bodyRef.current) bodyRef.current.scrollTop = 0;
        });
        return () => cancelAnimationFrame(frame);
    }, [isOpen, section]);

    return (
        <>
            {hasEntered && isInRoom && currentRoom === 'about' && !isTeleporting && (
                <button
                    type="button"
                    className="about-profile-trigger"
                    aria-haspopup="dialog"
                    aria-controls="about-profile-dialog"
                    onClick={() => openOverlay({ layout: 'profile' })}
                >
                    阅读关于我
                </button>
            )}
            <dialog
                ref={dialogRef}
                id="about-profile-dialog"
                className="about-profile-dialog"
                aria-labelledby="about-profile-title"
                onCancel={closeOverlay}
                onClose={closeOverlay}
                onClick={event => { if (event.target === event.currentTarget) closeOverlay(); }}
            >
                <div className="about-profile-paper">
                    <header className="about-profile-header">
                        <h2 id="about-profile-title">{personalProfile.titles.profile}</h2>
                        <button type="button" className="studio-close-btn" aria-label="关闭个人介绍" onClick={closeOverlay}>
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                    </header>
                    <nav className="about-profile-nav" aria-label="个人介绍目录">
                        {sections.map(item => (
                            <a key={item.id} href={`#profile-${item.id}`} onClick={event => {
                                event.preventDefault();
                                document.getElementById(`profile-${item.id}`)?.scrollIntoView({ block: 'start' });
                            }}>
                                {item.id === 'intro' ? '自我介绍' : item.title}
                            </a>
                        ))}
                        {resumeInfo?.url && <a href={resumeInfo.url} target="_blank" rel="noopener noreferrer">简历 PDF</a>}
                    </nav>
                    <div ref={bodyRef} className="about-profile-body" tabIndex={0} aria-label="个人介绍正文">
                        <ProfileContent profile={personalProfile} />
                    </div>
                </div>
            </dialog>
        </>
    );
}
