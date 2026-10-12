import type { GestureMode } from '@/features/piano-roll/types';

export type EditorCursor =
    | 'default'
    | 'crosshair'
    | 'move'
    | 'ew-resize'
    | 'grab'
    | 'grabbing'
    | 'pointer';

type Options = {
    mode: GestureMode;
    target: 'empty' | 'move' | 'resize' | 'outside';
    shiftKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    selectionCursor?: EditorCursor;
};

export function getInteractionCursor({
    mode,
    target,
    shiftKey,
    ctrlKey,
    metaKey,
    selectionCursor = 'crosshair',
}: Options): EditorCursor {
    if (mode === 'pan') return 'grabbing';
    if (mode === 'resize') return 'ew-resize';
    if (mode === 'move') return 'move';
    if (mode === 'marquee') return 'crosshair';
    if (mode === 'select') return selectionCursor;
    if (target === 'outside') return 'default';
    if (shiftKey) return 'grab';
    if (ctrlKey || metaKey) return target === 'empty' ? 'crosshair' : 'pointer';
    if (target === 'resize') return 'ew-resize';
    return target === 'move' ? 'move' : 'crosshair';
}
