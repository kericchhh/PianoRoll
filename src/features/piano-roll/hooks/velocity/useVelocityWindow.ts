import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type RefObject,
} from 'react';
import type { Note } from '@/features/piano-roll/types';
import type { PianoRollEditorModel } from '@/features/piano-roll/hooks/editor/usePianoRollEditor';
import {
    layoutVelocityBars,
    type VelocityBar,
} from '@/features/piano-roll/utils/velocity/layoutVelocityBars';

export function useVelocityWindow(
    editor: PianoRollEditorModel,
    enabled: boolean,
    focusRef: RefObject<HTMLDivElement | null>,
) {
    const [visible, setVisible] = useState<readonly Note[]>([]);
    const publishedRef = useRef<readonly Note[]>([]);
    const elementsRef = useRef(new Map<string, HTMLDivElement>());
    const layoutRef = useRef(new Map<string, VelocityBar>());
    const cacheRef = useRef('');
    const notesRef = useRef(editor.notes);
    const { width } = editor.viewport;
    const { velocityDrawRef } = editor;
    const register = useCallback(
        (id: string, node: HTMLDivElement | null) => {
            if (!node) {
                elementsRef.current.delete(id);
                return;
            }
            elementsRef.current.set(id, node);
            const bar = layoutRef.current.get(id);
            if (bar) {
                const labelOffset =
                    bar.x + bar.width + 32 <= width ? bar.width + 4 : -32;
                node.style.transform = `translateX(${bar.x}px)`;
                node.style.width = `${bar.width}px`;
                node.style.setProperty(
                    '--velocity-bar-width',
                    `${bar.width}px`,
                );
                node.style.setProperty(
                    '--velocity-label-offset',
                    `${Math.max(-bar.x, Math.min(width - bar.x - 28, labelOffset))}px`,
                );
            }
        },
        [width],
    );
    const draw = useCallback(() => {
        const view = editor.viewport.getView();
        const key = `${enabled}:${view.pixelsPerTick}:${view.scrollOffsetX}:${width}`;
        if (cacheRef.current === key && notesRef.current === editor.notes)
            return;
        cacheRef.current = key;
        notesRef.current = editor.notes;
        const candidates = enabled
            ? editor.queryNotes({
                  startTick: view.scrollOffsetX / view.pixelsPerTick,
                  endTick: (view.scrollOffsetX + width) / view.pixelsPerTick,
                  lowestPitch: 0,
                  highestPitch: 127,
              })
            : [];
        const bars = layoutVelocityBars(candidates, view, width);
        layoutRef.current = new Map(bars.map((bar) => [bar.note.id, bar]));
        for (const bar of bars) {
            const node = elementsRef.current.get(bar.note.id);
            if (!node) continue;
            const labelOffset =
                bar.x + bar.width + 32 <= width ? bar.width + 4 : -32;
            node.style.transform = `translateX(${bar.x}px)`;
            node.style.setProperty(
                '--velocity-label-offset',
                `${Math.max(-bar.x, Math.min(width - bar.x - 28, labelOffset))}px`,
            );
            const nextWidth = `${bar.width}px`;
            if (node.style.width !== nextWidth) {
                node.style.width = nextWidth;
                node.style.setProperty('--velocity-bar-width', nextWidth);
            }
        }
        const next = bars.map((bar) => bar.note);
        if (
            publishedRef.current.length === next.length &&
            next.every((note, index) => publishedRef.current[index] === note)
        )
            return;
        const focused = document.activeElement;
        const removed = [...elementsRef.current].some(
            ([id, node]) =>
                node.contains(focused) && !layoutRef.current.has(id),
        );
        if (removed) focusRef.current?.focus({ preventScroll: true });
        publishedRef.current = next;
        setVisible(next);
    }, [editor, enabled, focusRef, width]);
    useEffect(() => {
        velocityDrawRef.current = draw;
        const frame = requestAnimationFrame(draw);
        return () => {
            cancelAnimationFrame(frame);
            if (velocityDrawRef.current === draw)
                velocityDrawRef.current = null;
        };
    }, [draw, velocityDrawRef]);
    return { visible, register, elementsRef };
}
