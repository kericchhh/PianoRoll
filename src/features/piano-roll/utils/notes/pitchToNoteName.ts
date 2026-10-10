const PITCH_NAMES = [
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B',
];

export function pitchToNoteName(pitch: number): string {
    return `${PITCH_NAMES[pitch % 12]}${Math.floor(pitch / 12) - 1}`;
}
