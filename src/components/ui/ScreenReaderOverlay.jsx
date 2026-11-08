import { useScene } from '../../context/SceneContext';
import { useGalleryProjects, useStudioContent } from '../../hooks/useContentData';
import '../../styles/ScreenReaderOverlay.scss';
import { personalProfile, contactInfo, siteInfo, resumeInfo } from '../../data/content';
import ProfileContent from './ProfileContent';

/**
 * ScreenReaderOverlay 无障碍组件。
 * 
 * 不可见 HTML 层，让屏幕阅读器访问 3D 画布内容。
 * 包含与门、房间等 3D 交互元素对应的按钮和链接。
 * 通过 sr-only 视觉隐藏，但辅助技术仍可访问。
 */
const ROOM_LABELS = { about: '关于我', gallery: '画廊', contact: '联系我', studio: '生活手记' };

const ScreenReaderOverlay = () => {
    const { hasEntered, isInRoom, currentRoom, teleportTo, requestExit, openOverlay } = useScene();
    
    // 读取本地内容，生成供搜索引擎与辅助技术使用的隐藏 HTML。
    const projects = useGalleryProjects();
    const studio = useStudioContent();

    return (
        <div className="sr-overlay" role="complementary" aria-label="3D 作品集无障碍导航">
            {/* 跳转至内容的链接。 */}
            <a href="#sr-main-nav" className="sr-only sr-focusable">
                跳至无障碍导航
            </a>

            {/* 主要无障碍导航。 */}
            <nav id="sr-main-nav" className="sr-only" aria-label="作品集房间">
                <h1>Twiink's Space</h1>
                <h2>作品集导航</h2>

                {!hasEntered && (
                    <p>欢迎来到 Twiink's Space。做点有趣的东西，放一些舍不得关掉的脑洞。点击门或按回车键即可进入。</p>
                )}

                {hasEntered && !isInRoom && (
                    <>
                        <p>你现在位于走廊，请选择想探索的房间：</p>
                        <ul>
                            <li>
                                <button onClick={() => teleportTo('about')} type="button">
                                    关于我：故事、技能与经历
                                </button>
                            </li>
                            <li>
                                <button onClick={() => teleportTo('gallery')} type="button">
                                    画廊：项目与作品
                                </button>
                            </li>
                            <li>
                                <button onClick={() => teleportTo('contact')} type="button">
                                    联系我：欢迎交流
                                </button>
                            </li>
                            <li>
                                <button onClick={() => teleportTo('studio')} type="button">
                                    生活手记：旅行、游戏与随手记录
                                </button>
                            </li>
                        </ul>
                    </>
                )}

                {hasEntered && isInRoom && (
                    <>
                        <p>
                            你现在位于 {currentRoom === 'about' ? "关于我" :
                                currentRoom === 'gallery' ? "画廊" :
                                    currentRoom === 'contact' ? "联系我" :
                                        currentRoom === 'studio' ? "生活手记" : currentRoom} 房间。
                        </p>
                        <button onClick={requestExit} type="button">
                            返回走廊
                        </button>

                        {/* 各房间的内容说明。 */}
                        {currentRoom === 'about' && (
                            <div aria-label="关于我房间的内容">
                                <h3>关于我</h3>
                                <ProfileContent profile={personalProfile} idPrefix="sr-profile" />
                                {resumeInfo?.url && <a href={resumeInfo.url} download={resumeInfo.downloadName}>下载简历 PDF</a>}
                            </div>
                        )}
                        {currentRoom === 'gallery' && (
                            <div aria-label="画廊房间的内容">
                                <h3>我的项目</h3>
                                <p>浏览纸卡上的作品集项目。点击卡片，再选择「查看项目」阅读介绍或访问项目网站。</p>
                                
                                {projects && projects.length > 0 && (
                                    <ul>
                                        {projects.map((p, i) => (
                                            <li key={i}>
                                                <h4>{p.title}</h4>
                                                <p>{p.description}</p>
                                                {p.details ? (
                                                    <button type="button" aria-haspopup="dialog" aria-controls="project-details-dialog" onClick={() => openOverlay({ layout: 'project', projectId: p.id })}>
                                                        阅读 {p.title}
                                                    </button>
                                                ) : p.url && <a href={p.url}>访问 {p.title}</a>}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                        {currentRoom === 'contact' && (
                            <div aria-label="联系我房间的内容">
                                <h3>联系我</h3>
                                <p>{contactInfo.description}</p>
                                {resumeInfo?.url && <p><a href={resumeInfo.url} download={resumeInfo.downloadName}>下载简历 PDF</a></p>}
                                <p><a href={`mailto:${contactInfo.email}`}>发送邮件：{contactInfo.email}</a></p>
                                <p><a href={siteInfo.githubUrl} target="_blank" rel="noopener noreferrer">访问 Twiink 的 GitHub</a></p>
                                <p>微信号：{contactInfo.wechatId}</p>
                                <button type="button" aria-haspopup="dialog" aria-controls="contact-details-dialog" onClick={() => openOverlay({ layout: 'contact', target: 'wechat' })}>
                                    查看联系方式与复制微信号
                                </button>
                            </div>
                        )}
                        {currentRoom === 'studio' && (
                            <div aria-label="生活手记房间的内容">
                                <h3>生活手记</h3>
                                <p>出门走走、一起玩游戏，还有给网站画人物的过程。点击屏幕，或选择下面的一篇，翻翻这些生活与创作记录。</p>

                                {studio && studio.length > 0 && (
                                    <ul>
                                        {studio.map((s, i) => (
                                            <li key={i}>
                                                <h4>{s.title}</h4>
                                                <p>{s.description}</p>
                                                {s.layout === 'studio' ? (
                                                    <button type="button" aria-haspopup="dialog" aria-controls="studio-notes-dialog" onClick={() => openOverlay({ layout: 'studio', noteId: s.id })}>
                                                        阅读 {s.title}
                                                    </button>
                                                ) : s.url && <a href={s.url}>查看内容</a>}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        {/* 快速导航至其他房间。 */}
                        <h3>快速导航</h3>
                        <ul>
                            {currentRoom !== 'about' && (
                                <li><button onClick={() => teleportTo('about')} type="button">前往关于我</button></li>
                            )}
                            {currentRoom !== 'gallery' && (
                                <li><button onClick={() => teleportTo('gallery')} type="button">前往画廊</button></li>
                            )}
                            {currentRoom !== 'contact' && (
                                <li><button onClick={() => teleportTo('contact')} type="button">前往联系我</button></li>
                            )}
                            {currentRoom !== 'studio' && (
                                <li><button onClick={() => teleportTo('studio')} type="button">前往生活手记</button></li>
                            )}
                        </ul>
                    </>
                )}
            </nav>

            {/* 用于播报状态变化的实时区域。 */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
                {isInRoom && `已进入${ROOM_LABELS[currentRoom] || currentRoom}`}
            </div>
        </div>
    );
};

export default ScreenReaderOverlay;
