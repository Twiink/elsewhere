import { useScene } from '../../context/contexts';
import { useEffect, useRef } from 'react';

import { studioContent, studioWishes } from '../../data/content';
import StudioWishes from './StudioWishes';
import '../../styles/AboutProfile.scss';
import '../../styles/StudioNotes.scss';

export default function StudioNotes() {
    const { overlayContent, openOverlay, closeOverlay } = useScene();
    const dialogRef = useRef(null);
    const bodyRef = useRef(null);
    const noteId = overlayContent?.noteId || overlayContent?.id;
    const note = studioContent.find(item => item.id === noteId);
    const isWishes = overlayContent?.view === 'wishes';
    const isOpen = overlayContent?.layout === 'studio' && (isWishes || Boolean(note));


    useEffect(() => {
        const dialog = dialogRef.current;
        if (isOpen) {
            bodyRef.current.scrollTop = 0;
            if (!dialog.open) dialog.showModal();
        } else if (dialog.open) {
            dialog.close();
        }
    }, [isOpen, isWishes, note?.id]);

    return (
        <>
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
                            <h2 id="studio-note-title">{isWishes ? '想做的事' : note.title}</h2>
                            <button type="button" className="studio-close-btn" aria-label="关闭生活手记" onClick={closeOverlay}>
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                    <line x1="6" y1="18" x2="18" y2="6" />
                                </svg>
                            </button>
                        </header>
                        <nav className="studio-notes-nav" aria-label="切换生活手记">
                            {studioContent.map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    aria-pressed={!isWishes && note.id === item.id}
                                    onClick={() => openOverlay({ layout: 'studio', noteId: item.id })}
                                >
                                    {item.shortTitle || item.title}
                                </button>
                            ))}
                            <button
                                type="button"
                                aria-pressed={isWishes}
                                onClick={() => openOverlay({ layout: 'studio', view: 'wishes' })}
                            >
                                想做的事
                            </button>
                        </nav>
                        <div ref={bodyRef} className={`about-profile-body ${isWishes ? 'studio-wishes-body' : 'studio-note-body'}`} tabIndex={0} aria-label={isWishes ? '想做的事清单' : '记录正文'}>
                            {isWishes ? <StudioWishes wishes={studioWishes} /> : (
                                <article key={note.id}>
                                    <div className="studio-note-copy">
                                        {note.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                                    </div>
                                    <div className={`studio-note-photos${note.process ? ' studio-note-process' : ''}`}>
                                        {note.photos.map(photo => (
                                            <figure key={photo.src}>
                                                <a href={photo.src} target="_blank" rel="noopener noreferrer" aria-label={`${photo.label || note.title}，查看大图`}>
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
                                </article>
                            )}
                        </div>
                    </div>
                )}
            </dialog>
        </>
    );
}
