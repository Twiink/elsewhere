import { getProfileSections, formatProfileDate } from '../../data/profile.js';

// 三维阅读面板与无障碍正文使用同一份内容结构。
export default function ProfileContent({ profile, idPrefix = 'profile' }) {
    return getProfileSections(profile).map(section => (
        <section key={section.id} id={`${idPrefix}-${section.id}`} className="profile-section">
            <h3>{section.title}</h3>
            {section.paragraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
            {section.tags?.length > 0 && (
                <ul className="profile-keywords" aria-label="个人关键词">
                    {section.tags.map(tag => <li key={tag}>{tag}</li>)}
                </ul>
            )}
            {section.entries && (
                <ol className={`profile-entries ${section.id === 'timeline' ? 'profile-timeline' : ''}`}>
                    {section.entries.map(entry => (
                        <li key={entry.id}>
                            {entry.date && <time dateTime={entry.date}>{formatProfileDate(entry.date)}</time>}
                            <div>
                                <h4>{entry.title}</h4>
                                <p>{entry.description}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
            {section.footer && <p>{section.footer}</p>}
        </section>
    ));
}
