import { ACHIEVEMENTS } from '../../data/achievements';
import { useAchievements, useSecrets, useWorldTheme } from '../../context/contexts';
import '../../styles/AchievementPopup.scss';

const AchievementPopup = () => {
    const { activePopup } = useAchievements();
    const { theme } = useWorldTheme();
    const { draftPhase } = useSecrets();

    if (!activePopup || activePopup.id === 'corridor_enter' || draftPhase) return null;

    const data = ACHIEVEMENTS[activePopup.id];
    if (!data) return null;

    const isCompleted = activePopup.status === 'completed';
    const isHiding = activePopup.status === 'hiding';

    const isMoonlitScrollHint = theme === 'moonlight' && activePopup.id === 'corridor_explore' && !isCompleted;

    return (
        <div
            className={`achievement-popup ${isMoonlitScrollHint ? 'achievement-popup--moonlit-scroll' : ''} ${isCompleted ? 'completed' : ''} ${isHiding ? 'hiding' : ''}`}
        >
            {/* SVG 边框叠加层。 */}
            <svg
                className="popup-border"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
            >
                <path
                    d="M 0 0 L 100 0 L 100 0 L 98 10 L 100 20 L 97 35 L 100 50 L 98 65 L 100 80 L 97 90 L 100 100 L 90 97 L 80 100 L 70 96 L 60 100 L 50 97 L 40 100 L 30 96 L 20 100 L 10 97 L 0 100 L 0 100 L 2 90 L 0 80 L 3 65 L 0 50 L 2 35 L 0 20 L 3 10 L 0 0 Z"
                    fill="none"
                    stroke="#1a1a1a"
                    strokeWidth="0.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
            <div className="popup-content">
                <div className={`checkbox ${isCompleted ? 'checked' : ''}`}>
                    {isCompleted && (
                        <svg viewBox="0 0 24 24" className="checkmark">
                            <path d="M5 13l4 4L19 7" fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </div>
                <div className="text-content">
                    <span className="title">{isMoonlitScrollHint ? '滚动探索' : data.title}</span>
                    <span className="description">{isMoonlitScrollHint ? <svg viewBox="0 0 24 18" aria-hidden="true"><path d="M4 3l8 6 8-6M4 10l8 6 8-6" /></svg> : data.label}</span>
                </div>

            </div>
        </div>
    );
};

export default AchievementPopup;
