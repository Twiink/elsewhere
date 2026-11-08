import { useId, useRef, useState } from 'react';
import { studioChannels } from '../../data/content';
import '../../styles/StudioChannels.scss';

export default function StudioChannels() {
    const id = useId();
    const accountRef = useRef(null);
    const [copyStatus, setCopyStatus] = useState('');

    if (!studioChannels) return null;

    const copyAccount = async () => {
        try {
            await navigator.clipboard.writeText(studioChannels.videoAccount);
            setCopyStatus('视频号已复制，可以到微信里搜索。');
        } catch {
            accountRef.current?.focus();
            accountRef.current?.select();
            setCopyStatus('视频号已选中，可以长按或使用复制快捷键。');
        }
    };

    return (
        <section className="studio-channels" aria-labelledby={`${id}-title`}>
            <h3 id={`${id}-title`}>{studioChannels.title}</h3>
            <p>{studioChannels.description}</p>
            <a href={studioChannels.csdnUrl} target="_blank" rel="noopener noreferrer">逛逛工作室的 CSDN</a>
            <label htmlFor={`${id}-account`}>微信视频号</label>
            <div className="studio-channel-account">
                <input id={`${id}-account`} ref={accountRef} value={studioChannels.videoAccount} readOnly spellCheck={false} />
                <button type="button" onClick={copyAccount}>复制视频号</button>
            </div>
            <p className="studio-channel-hint">在微信视频号里搜索这个账号，就能找到工作室。</p>
            <p className="studio-channel-status" role="status" aria-live="polite">{copyStatus}</p>
        </section>
    );
}
