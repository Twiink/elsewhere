import { useEffect, useRef } from 'react';
import { useScene } from '../../context/SceneContext';
import { galleryProjects } from '../../data/content';
import '../../styles/AboutProfile.scss';
import '../../styles/ProjectDetails.scss';

const readableProjects = galleryProjects.filter(item => item.details);

function ProjectSection({ section }) {
    const body = <>
        {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        {section.entries.length > 0 && (
            <ul className="project-detail-entries">
                {section.entries.map(entry => (
                    <li key={entry.title}>
                        <h4>{entry.title}</h4>
                        <p>{entry.description}</p>
                    </li>
                ))}
            </ul>
        )}
    </>;

    return section.collapsible ? (
        <details className="project-detail-section project-detail-tools" id={`project-${section.id}`}>
            <summary>{section.title}</summary>
            {body}
        </details>
    ) : (
        <section className="project-detail-section" id={`project-${section.id}`}>
            <h3>{section.title}</h3>
            {body}
        </section>
    );
}

export default function ProjectDetails() {
    const { currentRoom, hasEntered, isInRoom, isTeleporting, overlayContent, openOverlay, closeOverlay } = useScene();
    const dialogRef = useRef(null);
    const bodyRef = useRef(null);
    const project = readableProjects.find(item => item.id === overlayContent?.projectId);
    const isOpen = overlayContent?.layout === 'project' && Boolean(project);
    const featuredProject = readableProjects[0];
    const photos = project?.details.photos || [];
    const videos = project?.details.videos || [];
    const entry = project?.details.entry;

    useEffect(() => {
        const dialog = dialogRef.current;
        if (isOpen) {
            bodyRef.current.scrollTop = 0;
            if (!dialog.open) dialog.showModal();
        }
        if (!isOpen && dialog.open) dialog.close();
    }, [isOpen, project?.id]);

    const goToSection = (event, id) => {
        event.preventDefault();
        document.getElementById(`project-${id}`)?.scrollIntoView({ block: 'start' });
    };

    return (
        <>
            {hasEntered && isInRoom && currentRoom === 'gallery' && !isTeleporting && featuredProject && (
                <button
                    type="button"
                    className="about-profile-trigger project-details-trigger"
                    aria-haspopup="dialog"
                    aria-controls="project-details-dialog"
                    onClick={() => openOverlay({ layout: 'project', projectId: featuredProject.id })}
                >
                    阅读项目介绍
                </button>
            )}
            <dialog
                ref={dialogRef}
                id="project-details-dialog"
                className="about-profile-dialog project-details-dialog"
                aria-labelledby="project-details-title"
                onCancel={closeOverlay}
                onClose={closeOverlay}
                onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }}
                onClick={event => { if (event.target === event.currentTarget) closeOverlay(); }}
            >
                {isOpen && (
                    <div className="about-profile-paper">
                        <header className="about-profile-header">
                            <h2 id="project-details-title">{project.title}</h2>
                            <button type="button" className="studio-close-btn" aria-label="关闭项目介绍" onClick={closeOverlay}>
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                    <line x1="6" y1="18" x2="18" y2="6" />
                                </svg>
                            </button>
                        </header>
                        {readableProjects.length > 1 && (
                            <nav className="project-detail-switcher" aria-label="切换项目">
                                {readableProjects.map(item => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        aria-pressed={item.id === project.id}
                                        onClick={() => openOverlay({ layout: 'project', projectId: item.id })}
                                    >
                                        {item.shortTitle || item.title}
                                    </button>
                                ))}
                            </nav>
                        )}
                        <nav className="about-profile-nav" aria-label="项目介绍目录">
                            <a href="#project-story" onClick={event => goToSection(event, 'story')}>项目介绍</a>
                            {photos.length > 0 && <a href="#project-photos" onClick={event => goToSection(event, 'photos')}>{project.details.photosLabel || '现场照片'}</a>}
                            {videos.length > 0 && <a href="#project-videos" onClick={event => goToSection(event, 'videos')}>开场小片段</a>}
                            <a href="#project-contributions" onClick={event => goToSection(event, 'contributions')}>我做了什么</a>
                            <a href="#project-entry" onClick={event => goToSection(event, 'entry')}>{entry.navLabel || (entry.image ? '打开小程序' : '访问网站')}</a>
                        </nav>
                        <div key={project.id} ref={bodyRef} className="about-profile-body project-details-body" tabIndex={0} aria-label="项目介绍正文">
                            <p className="project-detail-tagline">{project.details.tagline}</p>
                            {project.details.sections.map((section, index) => (
                                <div key={section.id}>
                                    <ProjectSection section={section} />
                                    {index === 0 && photos.length > 0 && (
                                        <section className="project-detail-section" id="project-photos">
                                            <h3>{project.details.photosTitle || '在乐园里'}</h3>
                                            <div className="project-detail-photos">
                                                {photos.map(photo => (
                                                    <figure key={photo.src}>
                                                        <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" />
                                                        <figcaption>{photo.caption}</figcaption>
                                                    </figure>
                                                ))}
                                            </div>
                                        </section>
                                    )}
                                    {index === 0 && videos.length > 0 && (
                                        <section className="project-detail-section" id="project-videos">
                                            <h3>看一小段开场</h3>
                                            <div className="project-detail-videos">
                                                {videos.map(video => (
                                                    <figure key={video.src}>
                                                        <video
                                                            controls
                                                            playsInline
                                                            preload="none"
                                                            muted={video.hasAudio === false}
                                                            poster={video.poster}
                                                            width={video.width}
                                                            height={video.height}
                                                            aria-label={video.title}
                                                        >
                                                            <source src={video.src} type={video.mimeType} />
                                                            <a href={video.src}>打开{video.title}</a>
                                                        </video>
                                                        <figcaption>{video.caption}</figcaption>
                                                    </figure>
                                                ))}
                                            </div>
                                            {project.details.references?.map(reference => (
                                                <p key={reference.url} className="project-detail-reference">
                                                    <a href={reference.url} target="_blank" rel="noopener noreferrer">{reference.title}（新窗口）</a>
                                                </p>
                                            ))}
                                        </section>
                                    )}
                                </div>
                            ))}
                            <section className={`project-detail-section project-detail-entry${entry.image ? '' : ' project-detail-entry-site'}`} id="project-entry">
                                <div>
                                    <h3>{entry.title}</h3>
                                    <p>{entry.description}</p>
                                    {entry.hint && <p className="project-detail-hint">{entry.hint}</p>}
                                    {entry.url && (
                                        <a className="project-detail-site-link" href={entry.url} target="_blank" rel="noopener noreferrer">
                                            {entry.label || '访问项目网站'}（新窗口）
                                        </a>
                                    )}
                                </div>
                                {entry.image && (
                                    <a href={entry.image} target="_blank" rel="noopener noreferrer" aria-label={`打开${project.shortTitle || project.title}小程序码原图`}>
                                        <img src={entry.image} alt={`${project.title}微信小程序码`} width={entry.width} height={entry.height} loading="lazy" decoding="async" />
                                    </a>
                                )}
                            </section>
                        </div>
                    </div>
                )}
            </dialog>
        </>
    );
}
