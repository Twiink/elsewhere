// 配图是对改动的手绘解释，文字与原始 PR 链接由 content.json 管理。
const drawings = {
    agenta: <>
        <path d="M23 25L141 29L136 191L20 187Z" fill="#f9f7ef" />
        <path d="M220 30L340 24L344 189L224 194Z" fill="#f9f7ef" />
        <path d="M43 66L121 67M42 145L119 147M243 66L321 65M244 147L322 146" />
        <path d="M38 94L123 96L121 122L38 121Z" fill="#e7d3ca" strokeDasharray="4 5" />
        <path d="M72 100L89 116M89 100L72 116" stroke="#986752" />
        <path d="M157 110Q180 102 204 109L192 98M204 109L193 121" />
        <path d="M247 99L255 108L270 90M248 126L256 134L272 116" stroke="#536d51" />
        <path d="M285 103L319 102M285 128L320 127" />
        <text x="20" y="225">一条出错</text><text x="218" y="225">其他照常</text>
    </>,
    loopx: <>
        <path d="M178 28Q215 20 253 34Q291 20 331 28L330 143Q293 134 254 147Q217 135 178 143Z" fill="#dde5d6" />
        <path d="M253 34L254 147M195 53L233 57M195 73L234 77M274 58L313 52M275 77L314 72M194 96L233 100M276 100L315 95" />
        <path d="M29 29L112 32L110 71L27 69ZM25 100L110 98L112 137L27 139ZM30 168L115 171L112 209L28 207Z" fill="#faf8f1" />
        <path d="M173 64Q141 59 120 53M171 87Q148 103 120 118M182 143Q155 182 121 188" stroke="#73856a" />
        <path d="M131 46L120 53L131 60M132 111L120 118L132 123M133 180L121 188L135 193" stroke="#73856a" />
        <text x="45" y="57">报告</text><text x="43" y="126">通知</text><text x="47" y="196">进度</text>
        <text x="193" y="190">一处定义</text><text x="193" y="218">多处引用</text>
    </>,
    deerflow: <>
        <path d="M22 43L119 39L123 169L25 175Z" fill="#faf8f1" />
        <text x="43" y="85">0</text><text x="43" y="128">−1</text>
        <path d="M37 68L88 94M36 113L95 139" stroke="#986752" />
        <path d="M139 109Q169 103 194 109L181 98M194 109L181 121" />
        <path d="M248 31L284 32M264 32L264 51" />
        <circle cx="263" cy="119" r="64" fill="#ece0bb" />
        <circle cx="263" cy="119" r="52" fill="#faf8ee" />
        <path d="M263 81L263 119L285 130M217 62L207 51M310 66L321 54" />
        <path d="M237 171L252 184L284 155" stroke="#536d51" />
        <text x="20" y="220">不合适的值</text><text x="214" y="220">用默认时间</text>
    </>,
    superset: <>
        <path d="M18 43L143 47L139 188L20 184ZM219 47L343 42L346 184L222 189Z" fill="#faf8ef" />
        <path d="M19 75L142 79M220 79L344 75M47 33L47 58M114 36L114 60M247 36L247 60M316 32L316 57" />
        <path d="M153 115Q178 109 207 115L196 104M207 115L196 127" />
        <path d="M35 91L128 94L127 153L35 151M236 94L330 91L331 151L237 154" fill="#dce5d5" stroke="none" />
        <text x="51" y="118">5 月</text><text x="66" y="145">12</text>
        <text x="251" y="119">4 月</text><text x="271" y="147">1</text>
        <text x="35" y="174">+08:00</text><text x="237" y="175">+08:00</text>
        <text x="18" y="222">原来的日期</text><text x="222" y="222">季度开头</text>
    </>,
};

export default function ContributionIllustration({ kind, alt, caption }) {
    const drawing = drawings[kind];
    if (!drawing) return null;
    return (
        <figure className="project-contribution-figure">
            <svg viewBox="0 0 360 240" role="img" aria-label={alt}>
                <title>{alt}</title>
                <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    {drawing}
                </g>
            </svg>
            <figcaption>{caption}</figcaption>
        </figure>
    );
}
