import { useScene } from '../../context/contexts';
import { Fragment, useEffect, useRef, useState } from 'react';

import { galleryProjects } from '../../data/content';
import ContributionIllustration from './ContributionIllustration';
import '../../styles/ProjectDetails.scss';

const readableProjects = galleryProjects.filter(item => item.details);

function ProjectSection({ section, media }) {
    const body = <>
        {section.paragraphs.map((paragraph, index) => (
            <Fragment key={paragraph}>
                <p>{paragraph}</p>
                {index === 0 && media}
            </Fragment>
        ))}
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

function ProjectPhotos({ photos }) {
    return <div className="project-detail-photos">
        {photos.map(photo => (
            <figure key={photo.src}>
                <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" />
                <figcaption>{photo.caption}</figcaption>
            </figure>
        ))}
    </div>;
}

export default function ProjectDetails() {
    const { overlayContent, openOverlay, closeOverlay } = useScene();
    const dialogRef = useRef(null);
    const bodyRef = useRef(null);
    const currentProjectRef = useRef(null);
    const [chapter, setChapter] = useState({ projectId: null, id: 'story' });
    const project = readableProjects.find(item => item.id === overlayContent?.projectId);
    const isOpen = overlayContent?.layout === 'project' && Boolean(project);
    const photos = project?.details.photos || [];
    const videos = project?.details.videos || [];
    const entry = project?.details.entry;
    const currentChapter = chapter.projectId === project?.id ? chapter.id : 'story';

    useEffect(() => {
        const dialog = dialogRef.current;
        if (isOpen) {
            bodyRef.current.scrollTop = 0;
            if (!dialog.open) dialog.showModal();
            currentProjectRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        } else if (dialog.open) dialog.close();
    }, [isOpen, project?.id]);

    const goToSection = (event, id) => {
        event.preventDefault();
        setChapter({ projectId: project.id, id });
        const target = bodyRef.current?.querySelector(`#project-${id}`);
        if (target) {
            const body = bodyRef.current;
            body.scrollTo({ top: target.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - 16 });
        }
    };

    const selectProject = id => {
        if (id === project.id) return;
        setChapter({ projectId: id, id: 'story' });
        openOverlay({ layout: 'project', projectId: id });
    };

    const handleClose = () => {
        setChapter({ projectId: null, id: 'story' });
        closeOverlay();
    };

    const handleProjectKey = event => {
        const currentIndex = readableProjects.findIndex(item => item.id === project.id);
        let nextIndex;
        if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % readableProjects.length;
        else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + readableProjects.length) % readableProjects.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = readableProjects.length - 1;
        else return;
        event.preventDefault();
        event.currentTarget.querySelectorAll('button')[nextIndex]?.focus({ preventScroll: true });
        selectProject(readableProjects[nextIndex].id);
    };

    const chapterLink = (id, label) => <a
        key={id}
        href={`#project-${id}`}
        aria-current={currentChapter === id ? 'location' : undefined}
        onClick={event => goToSection(event, id)}
    >{label}</a>;

    const openingPhoto = photos.length > 0 && <section className="project-detail-opening-photo" id="project-photos">
        <h3>{project?.details.photosTitle || '在乐园里'}</h3>
        <ProjectPhotos photos={photos.slice(0, 1)} />
    </section>;

    return <dialog
        ref={dialogRef}
        id="project-details-dialog"
        className="project-details-dialog"
        aria-labelledby="project-details-title"
        onCancel={handleClose}
        onClose={handleClose}
        onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }}
        onClick={event => { if (event.target === event.currentTarget) handleClose(); }}
    >
        {isOpen && <div className="project-notebook">
            <nav className="project-tabs" aria-label="切换项目" onKeyDown={handleProjectKey}>
                {readableProjects.map(item => <button
                    key={item.id}
                    ref={item.id === project.id ? currentProjectRef : null}
                    type="button"
                    aria-current={item.id === project.id ? 'page' : undefined}
                    aria-controls="project-notebook-content"
                    tabIndex={item.id === project.id ? 0 : -1}
                    onClick={() => selectProject(item.id)}
                >{item.shortTitle || item.title}</button>)}
            </nav>
            <div className="project-notebook-sheet" id="project-notebook-content">
                <figure className="project-notebook-cover" key={`cover-${project.id}`}>
                    <img src={project.painted || project.front} alt={`${project.shortTitle || project.title}项目插画`} decoding="async" />
                </figure>
                <div className="project-reading-sheet">
                    <header className="project-notebook-heading">
                        <h2 id="project-details-title">{project.title}</h2>
                        <p>{project.details.tagline}</p>
                    </header>
                    <nav className="project-chapters" aria-label="项目介绍目录">
                        {chapterLink('story', project.details.sections.find(section => section.id === 'story')?.navLabel || '项目介绍')}
                        {photos.length > 0 && chapterLink('photos', project.details.photosLabel || '现场照片')}
                        {videos.length > 0 && chapterLink('videos', '开场小片段')}
                        {project.details.sections.filter(section => section.id !== 'story' && (section.id === 'contributions' || section.navLabel)).map(section => chapterLink(section.id, section.navLabel || '我做了什么'))}
                        {project.details.references?.length > 0 && chapterLink('references', project.details.referencesTitle || '相关链接')}
                        {chapterLink('entry', entry.navLabel || (entry.image ? '打开小程序' : '访问网站'))}
                    </nav>
                    <div key={project.id} ref={bodyRef} className="project-details-body" tabIndex={0} aria-label="项目介绍正文">
                        {project.details.sections.map((section, index) => <Fragment key={section.id}>
                            <ProjectSection section={section} media={index === 0 ? openingPhoto : undefined} />
                            {index === 0 && photos.length > 1 && <section className="project-detail-section project-detail-photo-continuation" aria-label={project.details.photosLabel || '现场照片'}>
                                <ProjectPhotos photos={photos.slice(1)} />
                            </section>}
                            {index === 0 && videos.length > 0 && <section className="project-detail-section" id="project-videos">
                                <h3>看一小段开场</h3>
                                <div className="project-detail-videos">
                                    {videos.map(video => <figure key={video.src}>
                                        <video controls playsInline preload="none" muted={video.hasAudio === false} poster={video.poster} width={video.width} height={video.height} aria-label={video.title}>
                                            <source src={video.src} type={video.mimeType} />
                                            <a href={video.src}>打开{video.title}</a>
                                        </video>
                                        <figcaption>{video.caption}</figcaption>
                                    </figure>)}
                                </div>
                            </section>}
                        </Fragment>)}
                        {project.details.references?.length > 0 && <section className="project-detail-section" id="project-references">
                            <h3>{project.details.referencesTitle || '相关链接'}</h3>
                            {project.details.references.map(reference => <p key={reference.url} className="project-detail-reference">
                                <a href={reference.url} target="_blank" rel="noopener noreferrer">{reference.title}</a>
                            </p>)}
                        </section>}
                        <section className={`project-detail-section project-detail-entry${entry.image ? '' : ' project-detail-entry-site'}`} id="project-entry">
                            <div>
                                <h3>{entry.title}</h3>
                                <p>{entry.description}</p>
                                {entry.hint && <p className="project-detail-hint">{entry.hint}</p>}
                                {entry.url && <a className="project-detail-site-link" href={entry.url} target="_blank" rel="noopener noreferrer">{entry.label || '访问项目网站'}</a>}
                            </div>
                            {entry.image && <a href={entry.image} target="_blank" rel="noopener noreferrer" aria-label={`打开${project.shortTitle || project.title}小程序码原图`}>
                                <img src={entry.image} alt={`${project.title}微信小程序码`} width={entry.width} height={entry.height} loading="lazy" decoding="async" />
                            </a>}
                        </section>
                    </div>
                </div>
                <button type="button" className="project-details-close" aria-label="关闭项目介绍" onClick={handleClose}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
                </button>
            </div>
        </div>}
    </dialog>;
}
