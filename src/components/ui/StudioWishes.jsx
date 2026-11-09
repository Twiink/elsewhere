export default function StudioWishes({ wishes }) {
    return (
        <section className="studio-wish-journal" aria-label="旅行心愿手账">
            <p className="studio-wish-journal-intro">下一次，和周周一起。</p>
            <ul className="studio-wish-spread">
                {wishes.map((wish, index) => (
                    <li key={wish.id} className={index === 0 ? 'studio-wish-featured' : 'studio-wish-keepsake'}>
                        <figure>
                            {wish.image && (
                                <a className="studio-wish-photo" href={wish.image} target="_blank" rel="noopener noreferrer" aria-label={`${wish.title}，查看插画`}>
                                    <img src={wish.image} alt={wish.imageAlt} width="1254" height="1254" decoding="async" />
                                </a>
                            )}
                            <figcaption>
                                <h3>{wish.title}</h3>
                                {wish.description && <p className="studio-wish-handwriting">{wish.description}</p>}
                                <span className="sr-only">状态：{wish.status}</span>
                            </figcaption>
                        </figure>
                    </li>
                ))}
            </ul>
            <div className="studio-wish-journal-tail" aria-hidden="true">
                <svg viewBox="0 0 74 32" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" focusable="false">
                    <path d="M3 26c12 2 24-3 25-10 1-4-5-6-7-2-3 6 7 11 23 2" strokeDasharray="2 3" />
                    <path d="m44 12 22-8-10 20-3-9-9-3Zm9 3L66 4" />
                </svg>
            </div>
        </section>
    );
}
