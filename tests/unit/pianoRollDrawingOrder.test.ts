import { expect, test, vi } from 'vitest';
import { drawPianoRoll } from '@/features/piano-roll/rendering/grid/drawPianoRoll';
import { PIANO_ROLL_COLORS } from '@/features/piano-roll/rendering/colors';
import {
    createNoteIndex,
    queryNoteIndex,
} from '@/features/piano-roll/utils/notes/noteIndex';
import type { Note, PianoRollView } from '@/features/piano-roll/types';

type Fill = {
    color: string;
    x: number;
    y: number;
    width: number;
    height: number;
};

const view: PianoRollView = {
    pixelsPerTick: 0.5,
    scrollOffsetX: 0,
    highestVisiblePitch: 72,
    rowHeight: 20,
};

function note(id: string, startTick: number, pitch = 71): Note {
    return {
        id,
        startTick,
        pitch,
        durationTicks: 120,
        velocity: 80,
        selected: false,
    };
}

function canvas() {
    const fills: Fill[] = [];
    const context = {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        strokeRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        fillRect(x: number, y: number, width: number, height: number) {
            fills.push({ color: this.fillStyle, x, y, width, height });
        },
    };
    return {
        context: context as unknown as CanvasRenderingContext2D,
        noteFills: () =>
            fills.filter(({ color }) =>
                [
                    PIANO_ROLL_COLORS.note,
                    PIANO_ROLL_COLORS.selectedNote,
                    PIANO_ROLL_COLORS.ghost,
                ].some((noteColor) => noteColor === color),
            ),
    };
}

function render(
    notes: Record<string, Note>,
    previews: Record<string, Note> | null = null,
    overrides: Partial<Parameters<typeof drawPianoRoll>[1]> = {},
) {
    const { context, noteFills } = canvas();
    drawPianoRoll(context, {
        index: createNoteIndex(notes),
        view,
        width: 600,
        height: 60,
        endTick: 2400,
        previews,
        marquee: null,
        ...overrides,
    });
    return noteFills();
}

const source = {
    c: note('c', 480),
    a: note('a', 120, 72),
    b: note('b', 240),
};

test('visible notes retain composition insertion order across pitch buckets and start-time sorting', () => {
    expect(render(source).map(({ x, y }) => [x, y])).toEqual([
        [240, 20],
        [60, 0],
        [120, 20],
    ]);
});

test('all origin ghosts precede previews while replacements retain their original layer positions', () => {
    const fills = render(source, {
        b: { ...source.b, startTick: 600, selected: true },
        c: { ...source.c, startTick: 60, pitch: 70, selected: true },
    });
    expect(fills.map(({ color, x, y }) => [color, x, y])).toEqual([
        [PIANO_ROLL_COLORS.ghost, 120, 20],
        [PIANO_ROLL_COLORS.ghost, 240, 20],
        [PIANO_ROLL_COLORS.selectedNote, 30, 40],
        [PIANO_ROLL_COLORS.note, 60, 0],
        [PIANO_ROLL_COLORS.selectedNote, 300, 20],
    ]);
});

test('removing a preview from the viewport preserves the layers of surviving notes', () => {
    const fills = render(source, {
        a: { ...source.a, startTick: 1200 },
    });
    expect(fills.map(({ color, x, y }) => [color, x, y])).toEqual([
        [PIANO_ROLL_COLORS.ghost, 60, 0],
        [PIANO_ROLL_COLORS.note, 240, 20],
        [PIANO_ROLL_COLORS.note, 120, 20],
    ]);
});

test('previews entering from offscreen interleave at their original layers instead of painting over later notes', () => {
    const notes = {
        first: note('first', 2000),
        c: source.c,
        middle: note('middle', 360, 100),
        b: source.b,
    };
    const fills = render(notes, {
        middle: { ...notes.middle, pitch: 71, selected: true },
        first: { ...notes.first, startTick: 120, selected: true },
    });
    expect(fills.map(({ color, x }) => [color, x])).toEqual([
        [PIANO_ROLL_COLORS.selectedNote, 60],
        [PIANO_ROLL_COLORS.note, 240],
        [PIANO_ROLL_COLORS.selectedNote, 180],
        [PIANO_ROLL_COLORS.note, 120],
    ]);
});

test('viewport filtering includes spanning and partial-row notes while excluding touching time edges and outside pitches', () => {
    const fills = render(
        {
            leftTouch: note('leftTouch', 120),
            span: note('span', 180),
            rightTouch: note('rightTouch', 1440),
            low: note('low', 240, 70),
            below: note('below', 240, 69),
            high: note('high', 240, 72),
            above: note('above', 240, 73),
        },
        null,
        { view: { ...view, scrollOffsetX: 120 }, height: 41 },
    );
    expect(fills.map(({ x, y }) => [x, y])).toEqual([
        [-30, 20],
        [0, 40],
        [0, 0],
    ]);
});

test('the timeline end bounds both indexed originals and incoming previews', () => {
    const notes = {
        crosses: note('crosses', 900),
        beyond: note('beyond', 960),
        outside: note('outside', 1800),
    };
    expect(
        render(
            notes,
            { outside: { ...notes.outside, startTick: 960 } },
            {
                endTick: 960,
            },
        ).map(({ x, y }) => [x, y]),
    ).toEqual([[450, 20]]);
});

test.each(['unchanged', 'replacement', 'removal'] as const)(
    '%s scenes reuse query ordering without a second index-comparison pass',
    (mode) => {
        const index = createNoteIndex(source);
        const orderRead = vi.spyOn(index.order, 'get');
        queryNoteIndex(index, {
            startTick: 0,
            endTick: 1200,
            lowestPitch: 70,
            highestPitch: 72,
        });
        const queryReads = orderRead.mock.calls.length;
        expect(queryReads).toBeGreaterThan(0);
        orderRead.mockClear();
        const previews =
            mode === 'unchanged'
                ? null
                : {
                      a: {
                          ...source.a,
                          startTick: mode === 'replacement' ? 360 : 1200,
                      },
                  };
        const fills = render(source, previews, { index });
        expect(fills.length).toBe(mode === 'replacement' ? 4 : 3);
        expect(orderRead.mock.calls.length).toBeLessThanOrEqual(queryReads);
    },
);
