import { MIN_BPM, MAX_BPM } from '@/features/piano-roll/constants/music';

export function isValidBpm(value: unknown): value is number {
    return (
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= MIN_BPM &&
        value <= MAX_BPM
    );
}
