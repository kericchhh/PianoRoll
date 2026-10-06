import { PIANO_ROLL_COLORS } from '@/features/piano-roll/rendering/colors';

const DISPLAY_GAIN = 4;

export function drawWaveform(
    context: CanvasRenderingContext2D,
    samples: Float32Array | null,
    width: number,
    height: number,
): void {
    context.clearRect(0, 0, width, height);
    context.lineWidth = 1;
    context.strokeStyle = PIANO_ROLL_COLORS.timeGrid;
    context.beginPath();
    context.moveTo(0, height / 2);
    context.lineTo(width, height / 2);
    context.stroke();
    if (!samples || samples.length < 2) return;
    const amplitude = Math.max(0, height / 2 - 4);
    context.strokeStyle = PIANO_ROLL_COLORS.note;
    context.beginPath();
    for (let index = 0; index < samples.length; index++) {
        const value = Number.isFinite(samples[index])
            ? Math.max(-1, Math.min(1, samples[index] * DISPLAY_GAIN))
            : 0;
        const x = (index * width) / (samples.length - 1);
        const y = height / 2 - value * amplitude;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
    }
    context.stroke();
}
