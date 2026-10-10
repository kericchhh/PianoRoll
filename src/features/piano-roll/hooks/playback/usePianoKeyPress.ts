import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

export function usePianoKeyPress(
    pitch: number,
    onPreview?: (pitch: number) => void,
) {
    const [pressed, setPressed] = useState(false);
    const pointerRef = useRef<number | null>(null);

    const release = () => {
        pointerRef.current = null;
        setPressed(false);
    };
    const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0 || pointerRef.current !== null) return;
        pointerRef.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        setPressed(true);
        onPreview?.(pitch);
    };
    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (
            (event.key !== 'Enter' && event.key !== ' ') ||
            event.ctrlKey ||
            event.metaKey ||
            event.altKey ||
            event.shiftKey
        )
            return;
        event.preventDefault();
        if (event.repeat) return;
        setPressed(true);
        onPreview?.(pitch);
    };
    const onKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        release();
    };

    return {
        pressed,
        onPointerDown,
        onPointerUp: release,
        onPointerCancel: release,
        onLostPointerCapture: release,
        onBlur: release,
        onKeyDown,
        onKeyUp,
        onClick: (event: { detail: number }) => {
            if (event.detail === 0) onPreview?.(pitch);
        },
    };
}
