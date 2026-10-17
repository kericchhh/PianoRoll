import {
    ROW_HEIGHT,
    RULER_HEIGHT,
} from '@/features/piano-roll/constants/viewport';

export function velocityPanelBounds(workspaceHeight: number) {
    const reserved = RULER_HEIGHT + 24 + ROW_HEIGHT * 2;
    const max = Math.max(
        0,
        Math.min(320, workspaceHeight / 2, workspaceHeight - reserved),
    );
    return { min: Math.min(80, max), max };
}

export function clampVelocityHeight(
    height: number,
    workspaceHeight: number,
): number {
    const { min, max } = velocityPanelBounds(workspaceHeight);
    return Math.max(min, Math.min(max, height));
}
