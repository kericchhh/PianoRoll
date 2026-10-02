import type { MarqueeRect } from '@/features/piano-roll/types';

export function drawMarquee(context: CanvasRenderingContext2D, rect: MarqueeRect): void {
    const x = Math.min(rect.startX, rect.endX);
    const y = Math.min(rect.startY, rect.endY);
    const width = Math.abs(rect.endX - rect.startX);
    const height = Math.abs(rect.endY - rect.startY);
    if (width === 0 || height === 0) return;

    context.save();
    context.fillStyle = 'rgba(37, 99, 235, 0.12)';
    context.strokeStyle = '#2563eb';
    context.lineWidth = 1;
    context.fillRect(x, y, width, height);
    context.strokeRect(x, y, width, height);
    context.restore();
}
