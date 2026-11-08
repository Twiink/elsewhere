import { useEffect, useRef } from 'react';
import { useScene } from '../../context/SceneContext';
import { studioContent } from '../../data/content';
import StudioChannels from './StudioChannels';
import '../../styles/AboutProfile.scss';
import '../../styles/StudioNotes.scss';

// 房间导航会重写 URL，先保留访客打开页面时指定的记录。
const initialNoteId = new URLSearchParams(window.location.search).get('note');

export default function StudioNotes() {
    const { currentRoom, hasEntered, isInRoom, isTeleporting, overlayContent, openOverlay, closeOverlay } = useScene();
    const dialogRef = useRef(null);
    const bodyRef = useRef(null);
    const initialLinkHandled = useRef(false);
    const noteId = overlayContent?.noteId || overlayContent?.id;
    const note = studioContent.find(item => item.id === noteId);
    const isOpen = overlayContent?.layout === 'studio' && Boolean(note);
    const isInStudio = hasEntered && isInRoom && currentRoom === 'studio' && !isTeleporting;

    useEffect(() => {
        if (!isInStudio || initialLinkHandled.current) return;
        initialLinkHandled.current = true;
        if (studioContent.some(item => item.id === initialNoteId)) {
            openOverlay({ layout: 'studio', noteId: initialNoteId });
        }
    }, [isInStudio, openOverlay]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (isOpen) {
            bodyRef.current.scrollTop = 0;
            if (!dialog.open) dialog.showModal();
        } else if (dialog.open) {
            dialog.close();
        }
    }, [isOpen, note?.id]);

    return (
        <>
            {isInStudio && studioContent.length > 0 && (
                <button
                    type="button"
                    className="about-profile-trigger"
                    aria-haspopup="dialog"
                    aria-controls="studio-notes-dialog"
                    onClick={() => openOverlay({ layout: 'studio', noteId: studioContent[0].id })}
                >
                    翻翻生活与创作
                </button>
            )}
            <dialog
                ref={dialogRef}
                id="studio-notes-dialog"
                className="about-profile-dialog studio-notes-dialog"
                aria-labelledby="studio-note-title"
                onCancel={closeOverlay}
                onClose={closeOverlay}
                onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }}
                onClick={event => { if (event.target === event.currentTarget) closeOverlay(); }}
            >
                {isOpen && (
                    <div className="about-profile-paper">
                        <header className="about-profile-header">
                            <h2 id="studio-note-title">{note.title}</h2>
                            <button type="button" className="studio-close-btn" aria-label="关闭生活与创作记录" onClick={closeOverlay}>
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                    <line x1="6" y1="18" x2="18" y2="6" />
                                </svg>
                            </button>
                        </header>
                        <nav className="studio-notes-nav" aria-label="切换生活与创作记录">
                            {studioContent.map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    aria-pressed={note.id === item.id}
                                    onClick={() => openOverlay({ layout: 'studio', noteId: item.id })}
                                >
                                    {item.shortTitle || item.title}
                                </button>
                            ))}
                        </nav>
                        <article key={note.id} ref={bodyRef} className="about-profile-body studio-note-body" tabIndex={0} aria-label="记录正文">
                            <div className="studio-note-copy">
                                {note.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                            </div>
                            <div className={`studio-note-photos${note.process ? ' studio-note-process' : ''}`}>
                                {note.photos.map(photo => (
                                    <figure key={photo.src}>
                                        <a href={photo.src} target="_blank" rel="noopener noreferrer" aria-label={`${photo.label || note.title}，在新窗口查看大图`}>
                                            <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} decoding="async" />
                                        </a>
                                        {photo.label && (
                                            <figcaption>
                                                <strong>{photo.label}</strong>
                                                {photo.caption && <p>{photo.caption}</p>}
                                            </figcaption>
                                        )}
                                    </figure>
                                ))}
                            </div>
                            <StudioChannels />
                        </article>
                    </div>
                )}
            </dialog>
        </>
    );
}
