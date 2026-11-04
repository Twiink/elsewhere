// 英语与波兰语中的常见双字母组合，正常词语通常会频繁使用。
// 例如 dwgfn、ndwajdnw 等无意义字符在此集合中得分很低。
const COMMON_BIGRAMS = new Set([
    // 英语常见双字母组合。
    'th','he','in','er','an','re','on','at','en','nd','ti','es','or','te','of',
    'ed','is','it','al','ar','st','to','nt','ng','se','ha','as','ou','io','le',
    've','co','me','de','hi','ri','ro','ic','ne','ea','ra','ce','li','ch','ll',
    'be','ma','si','om','ur','ca','el','ta','la','ns','ge','ly','il','no','pe',
    'do','ss','ec','oo','so','us','wa','we','yo','lo','ow','wi','tr','su','pr',
    // 波兰语常见双字母组合。
    'ie','rz','sz','cz','ni','na','po','prz','od','do','ść','za','ko','ow',
    'sk','st','mi','wy','dz','ka','ra','je','ro','em','os','ak','ek','go',
    'ał','ze','cz','rz','ja','ma','ci','ło','wa','da','no','mo','li','ić',
]);

// 使用双字母频率分析单个词语的合理性。
const scoreWord = (word) => {
    if (word.length <= 2) return 1.0; // 太短，无法判断，直接通过。
    if (/^https?:\/\//i.test(word)) return 1.0; // 网址通过。
    if (/^\d+$/.test(word)) return 1.0; // 纯数字通过。
    if (/^[^a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+$/.test(word)) return 1.0; // 非字母内容，例如感叹号。

    const lower = word.toLowerCase();
    let hits = 0;
    let total = 0;

    for (let i = 0; i < lower.length - 1; i++) {
        const bigram = lower[i] + lower[i + 1];
        if (/[a-ząćęłńóśźż]{2}/.test(bigram)) {
            total++;
            if (COMMON_BIGRAMS.has(bigram)) hits++;
        }
    }

    if (total === 0) return 1.0;
    const bigramScore = hits / total; // 0.0 表示完全无意义，1.0 表示完全匹配。

    // 单词元音比例，正常词语通常约为 35% 至 45%。
    const vowels = (lower.match(/[aeiouyąęó]/g) || []).length;
    const alpha = (lower.match(/[a-ząćęłńóśźż]/g) || []).length;
    const vowelRatio = alpha > 0 ? vowels / alpha : 0;
    const vowelPenalty = (vowelRatio < 0.15 || vowelRatio > 0.85) ? 0.3 : 1.0;

    // 连续辅音惩罚。
    const hasHugeCluster = /[bcdfghjklmnpqrstvwxzżźć]{4,}/i.test(lower);
    const clusterPenalty = hasHugeCluster ? 0.5 : 1.0;

    return bigramScore * vowelPenalty * clusterPenalty;
};

// 内容分析器：分别评分后计算综合结果。
export const analyzeContentAI = (text, isSubject = false) => {
    if (!text) return { isSpam: true, reason: "内容过短" };

    const cleaned = text.trim();
    const hasChinese = /\p{Script=Han}/u.test(cleaned);
    if (cleaned.length < (isSubject || hasChinese ? 2 : 3)) {
        return { isSpam: true, reason: "内容过短" };
    }

    // 短于 15 字符且不含空格的拉丁字母留言较可疑；中文和主题不受此规则限制。
    if (!isSubject && !hasChinese && cleaned.length <= 15 && !cleaned.includes(' ')) {
        // 允许 hello、thanks 等常见短问候。
        const commonShort = /^(hi|hey|hello|thanks|thank you|cool|nice|ok|okay|yes|no|sup|yo|cheers|hej|cześć|dzięki|siema|elo)$/i;
        if (!commonShort.test(cleaned)) {
            return { isSpam: true, reason: "请补充留言内容" };
        }
    }

    const words = cleaned.replace(/\p{Script=Han}+/gu, ' ').split(/\s+/).filter(w => w.length > 0);
    const scorableWords = words.filter(w => w.length > 2 && /[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(w));

    if (scorableWords.length === 0) {
        return hasChinese ? { isSpam: false } : { isSpam: true, reason: "未检测到有效文字" };
    }

    // 逐词评分。
    const wordScores = scorableWords.map(w => scoreWord(w));
    const avgScore = wordScores.reduce((a, b) => a + b, 0) / wordScores.length;

    // 统计低于无意义词语阈值的数量。
    const gibberishCount = wordScores.filter(s => s < 0.25).length;
    const gibberishRatio = gibberishCount / scorableWords.length;

    // 平均得分过低或多数词语无法识别时，判为垃圾内容。
    if (avgScore < 0.2) {
        return { isSpam: true, reason: "内容似乎包含无意义字符" };
    }
    if (gibberishRatio >= 0.6 && scorableWords.length >= 2) {
        return { isSpam: true, reason: "内容中有过多无法识别的词语" };
    }

    // 整体元音比例检查，覆盖边界情况。
    const allAlpha = (cleaned.toLowerCase().match(/[a-ząćęłńóśźż]/g) || []);
    const allVowels = (cleaned.toLowerCase().match(/[aeiouyąęó]/g) || []);
    if (allAlpha.length > 8 && allVowels.length / allAlpha.length < 0.12) {
        return { isSpam: true, reason: "字符分布异常" };
    }

    return { isSpam: false };
};

