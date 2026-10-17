import {
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
    type RefObject,
} from 'react';
import { useDrag } from '@use-gesture/react';
import type { GestureMode } from '@/features/piano-roll/types';
import { useElementSize } from '@/shared/hooks/useElementSize';
import {
    clampVelocityHeight,
    velocityPanelBounds,
} from '@/features/piano-roll/utils/velocity/velocityMath';

export function useVelocityPanel(
    workspaceRef: RefObject<HTMLDivElement | null>,
    gestureModeRef: RefObject<GestureMode>,
) {
    const { height: workspaceHeight } = useElementSize(workspaceRef, {
        width: 600,
        height: 240,
    });
    const [open, setOpen] = useState(false);
    const [storedHeight, setHeight] = useState(160);
    const [dragging, setDragging] = useState(false);
    const handleRef = useRef<HTMLDivElement>(null);
    const originRef = useRef({ open: false, height: 160 });
    const suppressClickRef = useRef(false);
    const bounds = velocityPanelBounds(workspaceHeight);
    const height = open
        ? dragging
            ? Math.max(0, Math.min(bounds.max, storedHeight))
            : clampVelocityHeight(storedHeight, workspaceHeight)
        : 0;

    function toggle() {
        if (gestureModeRef.current !== 'idle' || bounds.max === 0) return;
        setHeight((previous) =>
            open ? previous : clampVelocityHeight(previous, workspaceHeight),
        );
        setOpen(!open);
    }
    function cancel() {
        if (gestureModeRef.current !== 'velocity-panel') return;
        gestureModeRef.current = 'idle';
        setDragging(false);
        setOpen(originRef.current.open);
        setHeight(originRef.current.height);
        suppressClickRef.current = true;
    }
    useDrag(
        ({ first, last, tap, canceled, movement: [, dy], event }) => {
            if (tap) return;
            if (first) {
                if (gestureModeRef.current !== 'idle' || bounds.max === 0)
                    return;
                originRef.current = {
                    open,
                    height: open ? height : storedHeight,
                };
                gestureModeRef.current = 'velocity-panel';
                setDragging(true);
            }
            if (gestureModeRef.current !== 'velocity-panel') return;
            if (canceled || event.type === 'pointercancel') {
                cancel();
                return;
            }
            event.preventDefault();
            const next = Math.max(
                0,
                Math.min(
                    bounds.max,
                    (originRef.current.open ? originRef.current.height : 0) -
                        dy,
                ),
            );
            setOpen(true);
            setHeight(next);
            if (last) {
                gestureModeRef.current = 'idle';
                setDragging(false);
                suppressClickRef.current = true;
                setOpen(next >= bounds.min / 2 && next > 0);
                setHeight(
                    next < bounds.min / 2
                        ? 160
                        : clampVelocityHeight(next, workspaceHeight),
                );
            }
        },
        {
            target: handleRef,
            filterTaps: true,
            pointer: { keys: false, buttons: 1 },
            eventOptions: { passive: false },
        },
    );

    const cancelRef = useRef(cancel);
    useEffect(() => {
        cancelRef.current = cancel;
    });
    useEffect(() => {
        const abort = () => cancelRef.current();
        window.addEventListener('blur', abort);
        return () => {
            window.removeEventListener('blur', abort);
            if (gestureModeRef.current === 'velocity-panel')
                gestureModeRef.current = 'idle';
        };
    }, [gestureModeRef]);

    function handleKeyDown(event: KeyboardEvent) {
        if (
            event.ctrlKey ||
            event.metaKey ||
            event.altKey ||
            gestureModeRef.current !== 'idle'
        )
            return;
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (!event.repeat) toggle();
        } else if (
            ['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)
        ) {
            event.preventDefault();
            const next =
                event.key === 'Home'
                    ? bounds.min
                    : event.key === 'End'
                      ? bounds.max
                      : (open ? height : 160) +
                        (event.key === 'ArrowUp' ? 16 : -16);
            setHeight(clampVelocityHeight(next, workspaceHeight));
            setOpen(bounds.max > 0);
        }
    }
    function handleClick() {
        if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
        }
        toggle();
    }
    return {
        open: open && bounds.max > 0,
        height,
        contentHeight: open
            ? height
            : clampVelocityHeight(storedHeight, workspaceHeight),
        dragging,
        maximum: bounds.max,
        handleRef,
        toggle,
        handleKeyDown,
        handleClick,
        clearClick: () => {
            suppressClickRef.current = false;
        },
    };
}
