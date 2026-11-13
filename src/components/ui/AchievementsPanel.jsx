import { ACHIEVEMENTS } from '../../data/achievements';
import { useAchievements, useSecrets } from '../../context/contexts';
import { SECRETS } from '../../data/secrets';
import React from 'react';

import '../../styles/AchievementsPanel.scss';

const AchievementsPanel = ({ isOpen, onClose }) => {
    const { completed } = useAchievements();
    const { discovered } = useSecrets();

    return (
        <div id="exploration-panel" className={`achievements-panel ${isOpen ? 'open' : ''}`} inert={!isOpen ? true : undefined} onWheel={event => event.stopPropagation()} onTouchMove={event => event.stopPropagation()} onKeyDown={event => {
            event.stopPropagation();
            if (event.key === 'Escape') onClose();
        }}>
            <div className="achievements-card">
                <div className="achievements-header">
                    <h3>探索手记</h3>
                    <button
                        className="close-btn"
                        onClick={onClose}
                        aria-label="关闭探索手记"
                    >
                        <svg viewBox="0 0 24 24">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="achievements-content" tabIndex={0} aria-label="探索手记内容">
                    <section className="secrets-section" aria-labelledby="secrets-heading">
                        <div className="notebook-section-heading">
                            <h4 id="secrets-heading">小秘密</h4>
                            <span className="secrets-progress">已发现 {discovered.length} / {SECRETS.length}</span>
                        </div>
                        <p className="secrets-intro">藏在走廊里的几处小惊喜。</p>
                        <ul className="secrets-list">
                            {SECRETS.map(secret => {
                                const found = discovered.includes(secret.id);
                                return <li key={secret.id} className={`secret-item${found ? ' found' : ''}`}>
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M4 3.5L19 4L20 20L3.5 19.5Z" />
                                        {found ? <path d="M7 12L10.5 15.5L17 8.5" /> : <path d="M10 9.5A2 2 0 0 1 14 10C14 11.5 12 11.5 12 13M12 16V16.1" />}
                                    </svg>
                                    <div>
                                        <span className="secret-title">{found ? secret.title : '等你发现'}</span>
                                        <span className="secret-hint">{found ? '已收进这页手记' : secret.hint}</span>
                                    </div>
                                </li>;
                            })}
                        </ul>
                    </section>
                    <section aria-labelledby="achievements-heading">
                        <div className="notebook-section-heading">
                            <h4 id="achievements-heading">探索成就</h4>
                            <span>{completed.length} / {Object.keys(ACHIEVEMENTS).length} 已探索</span>
                        </div>
                        <div className="achievements-list">
                            {Object.values(ACHIEVEMENTS).map((achievement) => {
                                const isUnlocked = completed.includes(achievement.id);
                                return (
                                    <div key={achievement.id} className={`achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`}>
                                        <div className="achievement-icon">
                                            {isUnlocked ? (
                                                <svg viewBox="0 0 24 24" className="icon-unlocked">
                                                    <path d="M12 15l-3-3 1.4-1.4 1.6 1.6 4.6-4.6L18 9" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    <circle cx="12" cy="12" r="10" fill="none" stroke="#1a1a1a" strokeWidth="2" />
                                                </svg>
                                            ) : (
                                                <svg viewBox="0 0 24 24" className="icon-locked">
                                                    <rect x="7" y="11" width="10" height="8" rx="2" fill="none" stroke="#666" strokeWidth="2" />
                                                    <path d="M9 11V8a3 3 0 0 1 6 0v3" fill="none" stroke="#666" strokeWidth="2" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="achievement-text">
                                            <div className="achievement-title">{achievement.title}</div>
                                            <div className="achievement-label">{achievement.label}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>

                <div className="achievements-footer">
                    <span>{discovered.length === SECRETS.length ? '这一页的小惊喜，被你找齐了。' : '慢慢逛，不着急。'}</span>
                </div>
            </div>
        </div>
    );
};

export default AchievementsPanel;
