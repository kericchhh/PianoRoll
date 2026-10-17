import type { ComponentProps } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { Slider } from '@/shared/components/ui/slider';
import { VelocityNoteSlider } from '@/features/piano-roll/components/velocity/VelocityNoteSlider';
import {
    useVelocityNotes,
    type VelocityNotes,
} from '@/features/piano-roll/hooks/velocity/useVelocityNotes';
import { usePianoRollEditor } from '@/features/piano-roll/hooks/editor/usePianoRollEditor';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import type { Note } from '@/features/piano-roll/types';

type SliderProps = ComponentProps<typeof Slider>;
const { renders, sliderProps } = vi.hoisted(() => ({
    renders: new Map<string, number>(),
    sliderProps: new Map<string, SliderProps>(),
}));
vi.mock('@/shared/components/ui/slider', () => ({
    Slider: (props: SliderProps) => {
        renders.set(props.label, (renders.get(props.label) ?? 0) + 1);
        sliderProps.set(props.label, props);
        return (
            <div
                role="slider"
                aria-label={props.label}
                aria-valuenow={props.value?.[0]}
            />
        );
    },
}));

const first: Note = {
    id: 'a',
    pitch: 72,
    startTick: 0,
    durationTicks: 120,
    velocity: 80,
    selected: true,
};
const second: Note = {
    ...first,
    id: 'b',
    pitch: 70,
    startTick: 240,
    velocity: 100,
    selected: false,
};
const firstLabel = 'Velocity for C5 at tick 0';
const secondLabel = 'Velocity for A#4 at tick 240';

beforeEach(() => {
    renders.clear();
    sliderProps.clear();
    useNoteStore.setState({
        ...useNoteStore.getInitialState(),
        notes: { a: first, b: second },
    });
});
afterEach(cleanup);

function setup() {
    let current: VelocityNotes | null = null;
    const register = vi.fn();
    function Harness() {
        const editor = usePianoRollEditor(7680);
        const notes = useVelocityNotes(editor);
        current = notes;
        return Object.values(editor.notes).map((note) => (
            <VelocityNoteSlider
                key={note.id}
                note={note}
                tabIndex={note.id === notes.activeId ? 0 : -1}
                register={register}
                begin={notes.begin}
                preview={notes.preview}
                finish={notes.finish}
                commit={notes.commit}
                focusNote={notes.focusNote}
                previewRef={notes.previewRef}
            />
        ));
    }
    render(<Harness />);
    const props = () => {
        const value = sliderProps.get(firstLabel);
        if (!value) throw new Error('First slider did not render');
        return value;
    };
    const controller = () => {
        if (!current) throw new Error('Velocity controller did not mount');
        return current;
    };
    const down = () =>
        act(() =>
            props().onPointerDown?.({
                button: 0,
                preventDefault: vi.fn(),
            } as unknown as Parameters<
                NonNullable<SliderProps['onPointerDown']>
            >[0]),
        );
    const preview = (value: number) =>
        act(() => props().onValueChange?.([value]));
    const up = (value: number) =>
        act(() => {
            props().onPointerUp?.(
                {} as Parameters<NonNullable<SliderProps['onPointerUp']>>[0],
            );
            props().onValueCommit?.([value]);
        });
    const value = () =>
        screen
            .getByRole('slider', { name: firstLabel })
            .getAttribute('aria-valuenow');
    return { props, controller, down, preview, up, value };
}

test('finishing a changed preview renders only its target and commits exactly one edit', () => {
    const { down, preview, up, value } = setup();
    const original = useNoteStore.getState();
    const untouchedRenders = renders.get(secondLabel);
    down();
    preview(20);
    expect(value()).toBe('20');
    expect(useNoteStore.getState()).toBe(original);
    const targetRenders = renders.get(firstLabel)!;
    up(20);
    expect(value()).toBe('20');
    expect(useNoteStore.getState().notes.a).toEqual({ ...first, velocity: 20 });
    expect(useNoteStore.getState().notes.b).toBe(second);
    expect(useNoteStore.getState().undoStack).toHaveLength(1);
    expect(renders.get(firstLabel)).toBeGreaterThan(targetRenders);
    expect(renders.get(secondLabel)).toBe(untouchedRenders);
});

test.each(['pointercancel', 'blur'] as const)(
    '%s resets only the target draft and ignores remaining captured pointer updates',
    (reason) => {
        const { props, controller, down, preview, up, value } = setup();
        const original = useNoteStore.getState();
        const untouchedRenders = renders.get(secondLabel);
        down();
        preview(20);
        const targetRenders = renders.get(firstLabel)!;
        act(() => {
            if (reason === 'blur') window.dispatchEvent(new Event('blur'));
            else
                props().onPointerCancel?.(
                    {} as Parameters<
                        NonNullable<SliderProps['onPointerCancel']>
                    >[0],
                );
        });
        expect(value()).toBe('80');
        expect(controller().previewRef.current).toBeNull();
        expect(renders.get(firstLabel)).toBeGreaterThan(targetRenders);
        expect(renders.get(secondLabel)).toBe(untouchedRenders);
        preview(30);
        up(30);
        expect(value()).toBe('80');
        expect(useNoteStore.getState()).toBe(original);
        down();
        preview(40);
        up(40);
        expect(value()).toBe('40');
        expect(useNoteStore.getState().undoStack).toHaveLength(1);
        expect(renders.get(secondLabel)).toBe(untouchedRenders);
    },
);

test('a no-op drag clears its local preview without publishing history or rerendering neighboring sliders', () => {
    const { controller, down, preview, up, value } = setup();
    const original = useNoteStore.getState();
    const untouchedRenders = renders.get(secondLabel);
    down();
    preview(20);
    preview(80);
    const targetRenders = renders.get(firstLabel)!;
    up(80);
    expect(value()).toBe('80');
    expect(controller().previewRef.current).toBeNull();
    expect(useNoteStore.getState()).toBe(original);
    expect(renders.get(firstLabel)).toBeGreaterThan(targetRenders);
    expect(renders.get(secondLabel)).toBe(untouchedRenders);
});

test('an intervening note update cancels the target draft while preserving the external value and neighboring memoized slider', () => {
    const { controller, down, preview, up, value } = setup();
    const untouchedRenders = renders.get(secondLabel);
    down();
    preview(20);
    act(() => useNoteStore.getState().setNoteVelocity('a', 90));
    expect(value()).toBe('90');
    expect(controller().previewRef.current).toBeNull();
    preview(30);
    up(30);
    expect(value()).toBe('90');
    expect(useNoteStore.getState().notes.a).toEqual({ ...first, velocity: 90 });
    expect(useNoteStore.getState().undoStack).toHaveLength(1);
    expect(renders.get(secondLabel)).toBe(untouchedRenders);
});
