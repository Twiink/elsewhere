export const KONAMI_KEYS = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
export const KONAMI_LABELS = ['↑', '↑', '↓', '↓', '←', '→', '←', '→', 'B', 'A'];

// 错键后保留仍能作为暗号开头的后缀，连续按三次上也能接着输入。
export function advanceKonamiStep(step, key) {
    const normalized = key.length === 1 ? key.toLowerCase() : key;
    const input = [...KONAMI_KEYS.slice(0, step), normalized];
    for (let length = Math.min(input.length, KONAMI_KEYS.length); length > 0; length--) {
        if (input.slice(-length).every((item, index) => item === KONAMI_KEYS[index])) return length;
    }
    return 0;
}
