// 同一房间的分布在刷新、降档和重新进入后保持一致。
export function seededRandom(seed) {
    let value = seed;
    return () => {
        value = Math.sin(value * 9999) * 10000;
        return value - Math.floor(value);
    };
}
