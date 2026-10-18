import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent,
    type PointerEvent,
} from 'react';

type Props = {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    format: (value: number) => string;
    shortFormat?: (value: number) => string;
    onChange: (value: number) => void;
    commitOnRelease?: boolean;
};

const adjustmentKeys = new Set([
    'ArrowUp',
    'ArrowRight',
    'ArrowDown',
    'ArrowLeft',
    'Home',
    'End',
]);

export function RotaryKnob({
    label,
    value,
    min,
    max,
    step,
    format,
    shortFormat = format,
    onChange,
    commitOnRelease = false,
}: Props) {
    const [draft, setDraft] = useState(value);
    const draftRef = useRef(value);
    const dragRef = useRef<{ id: number; y: number; value: number } | null>(
        null,
    );
    const keyEditingRef = useRef(false);
    const keyOriginRef = useRef(value);
    useEffect(() => {
        if (dragRef.current || keyEditingRef.current) return;
        draftRef.current = value;
        setDraft(value);
    }, [value]);

    function snap(raw: number) {
        const clamped = Math.min(max, Math.max(min, raw));
        return Number(
            (min + Math.round((clamped - min) / step) * step).toFixed(3),
        );
    }

    function preview(next: number) {
        if (next === draftRef.current) return;
        draftRef.current = next;
        setDraft(next);
        if (!commitOnRelease) onChange(next);
    }

    function finish() {
        if (commitOnRelease && draftRef.current !== value)
            onChange(draftRef.current);
        keyEditingRef.current = false;
        dragRef.current = null;
    }

    function cancel() {
        const origin = dragRef.current?.value ?? keyOriginRef.current;
        if (!commitOnRelease && draftRef.current !== origin) onChange(origin);
        draftRef.current = origin;
        setDraft(origin);
        keyEditingRef.current = false;
        dragRef.current = null;
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (
            event.key === 'Escape' &&
            (keyEditingRef.current || dragRef.current)
        ) {
            event.preventDefault();
            event.stopPropagation();
            cancel();
            return;
        }
        if (!adjustmentKeys.has(event.key)) return;
        event.preventDefault();
        if (!keyEditingRef.current) keyOriginRef.current = draftRef.current;
        keyEditingRef.current = true;
        const delta =
            event.key === 'ArrowUp' || event.key === 'ArrowRight'
                ? step
                : -step;
        preview(
            event.key === 'Home'
                ? min
                : event.key === 'End'
                  ? max
                  : snap(draftRef.current + delta),
        );
    }

    function handleKeyUp(event: KeyboardEvent<HTMLDivElement>) {
        if (adjustmentKeys.has(event.key) && keyEditingRef.current) finish();
    }

    function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
        if (event.button !== 0) return;
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = {
            id: event.pointerId,
            y: event.clientY,
            value: draftRef.current,
        };
        event.preventDefault();
    }

    function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
        const drag = dragRef.current;
        if (!drag || drag.id !== event.pointerId) return;
        preview(
            snap(drag.value + ((drag.y - event.clientY) * (max - min)) / 120),
        );
    }

    function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
        if (dragRef.current?.id !== event.pointerId) return;
        finish();
        if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
    }

    function handlePointerCancel(event: PointerEvent<HTMLDivElement>) {
        if (dragRef.current?.id === event.pointerId) cancel();
    }

    const progress = (draft - min) / (max - min);
    const style = {
        '--knob-angle': `${-135 + progress * 270}deg`,
        '--knob-fill': `${progress * 270}deg`,
    } as CSSProperties;

    return (
        <div className="flex min-w-0 flex-col items-center gap-1">
            <div
                role="slider"
                tabIndex={0}
                aria-label={label}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={draft}
                aria-valuetext={format(draft)}
                className="fx-knob"
                style={style}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                onBlur={() => {
                    if (keyEditingRef.current) finish();
                    else if (dragRef.current) cancel();
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
            >
                <span className="fx-knob-face" aria-hidden="true" />
            </div>
            <div className="fx-knob-caption">
                <span className="font-bold text-foreground">
                    {label.split(' ').at(-1)}
                </span>
                <span className="tabular-nums text-muted-foreground">
                    {shortFormat(draft)}
                </span>
            </div>
        </div>
    );
}
