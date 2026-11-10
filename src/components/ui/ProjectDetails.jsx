import { useScene } from '../../context/contexts';
import { useEffect, useRef } from 'react';

import { galleryProjects } from '../../data/content';
import ContributionIllustration from './ContributionIllustration';
import '../../styles/AboutProfile.scss';
import '../../styles/ProjectDetails.scss';

const readableProjects = galleryProjects.filter(item => item.details);

function ProjectSection({ section }) {
    const body = <>
        {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        {section.entries.length > 0 && (
            <ul className="project-detail-entries">
                {section.entries.map(entry => (
                    <li key={entry.title} className={entry.illustration ? 'project-detail-illustrated-entry' : undefined}>
                        <div>
                            <h4>{entry.title}</h4>
                            <p>{entry.description}</p>
                            {entry.links?.length > 0 && (
                                <div className="project-entry-links">
                                    {entry.links.map(link => (
                                        <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">{link.title}</a>
                                    ))}
                                </div>
                            )}
                        </div>
                        {entry.illustration && <ContributionIllustration {...entry.illustration} />}
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
    const { overlayContent, openOverlay, closeOverlay } = useScene();
    const dialogRef = useRef(null);
    const bodyRef = useRef(null);
    const project = readableProjects.find(item => item.id === overlayContent?.projectId);
    const isOpen = overlayContent?.layout === 'project' && Boolean(project);
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
                            <div className="project-header-actions">
                                {readableProjects.length > 1 && (
                                    <label className="project-detail-picker">
                                        <select
                                            aria-label="切换项目"
                                            value=""
                                            onChange={event => openOverlay({ layout: 'project', projectId: event.target.value })}
                                        >
                                            <option value="" disabled>切换项目</option>
                                            {readableProjects.map(item => (
                                                <option key={item.id} value={item.id} disabled={item.id === project.id}>{item.shortTitle || item.title}</option>
                                            ))}
                                        </select>
                                        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
                                    </label>
                                )}
                                <button type="button" className="studio-close-btn" aria-label="关闭项目介绍" onClick={closeOverlay}>
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                        <line x1="6" y1="18" x2="18" y2="6" />
                                    </svg>
                                </button>
                            </div>
                        </header>
                        <nav className="about-profile-nav" aria-label="项目介绍目录">
                            <a href="#project-story" onClick={event => goToSection(event, 'story')}>{project.details.sections.find(section => section.id === 'story')?.navLabel || '项目介绍'}</a>
                            {photos.length > 0 && <a href="#project-photos" onClick={event => goToSection(event, 'photos')}>{project.details.photosLabel || '现场照片'}</a>}
                            {videos.length > 0 && <a href="#project-videos" onClick={event => goToSection(event, 'videos')}>开场小片段</a>}
                            {project.details.sections.filter(section => section.id !== 'story' && (section.id === 'contributions' || section.navLabel)).map(section => (
                                <a key={section.id} href={`#project-${section.id}`} onClick={event => goToSection(event, section.id)}>{section.navLabel || '我做了什么'}</a>
                            ))}
                            {project.details.references?.length > 0 && <a href="#project-references" onClick={event => goToSection(event, 'references')}>{project.details.referencesTitle || '相关链接'}</a>}
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
                                        </section>
                                    )}
                                </div>
                            ))}
                            {project.details.references?.length > 0 && (
                                <section className="project-detail-section" id="project-references">
                                    <h3>{project.details.referencesTitle || '相关链接'}</h3>
                                    {project.details.references.map(reference => (
                                        <p key={reference.url} className="project-detail-reference">
                                            <a href={reference.url} target="_blank" rel="noopener noreferrer">{reference.title}</a>
                                        </p>
                                    ))}
                                </section>
                            )}
                            <section className={`project-detail-section project-detail-entry${entry.image ? '' : ' project-detail-entry-site'}`} id="project-entry">
                                <div>
                                    <h3>{entry.title}</h3>
                                    <p>{entry.description}</p>
                                    {entry.hint && <p className="project-detail-hint">{entry.hint}</p>}
                                    {entry.url && (
                                        <a className="project-detail-site-link" href={entry.url} target="_blank" rel="noopener noreferrer">
                                            {entry.label || '访问项目网站'}
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
