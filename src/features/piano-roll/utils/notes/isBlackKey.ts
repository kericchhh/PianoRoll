const BLACK_KEYS = new Set([1, 3, 6, 8, 10]);

export function isBlackKey(pitch: number): boolean {
    return BLACK_KEYS.has(pitch % 12);
}
