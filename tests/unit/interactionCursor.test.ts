import { expect, test } from 'vitest';
import { getInteractionCursor } from '@/features/piano-roll/utils/notes/getInteractionCursor';

const idle: Parameters<typeof getInteractionCursor>[0] = {
    mode: 'idle',
    target: 'empty',
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
};

test.each([
    ['outside', 'default'],
    ['empty', 'crosshair'],
    ['move', 'move'],
    ['resize', 'ew-resize'],
] as const)('idle target %s uses %s', (target, expected) => {
    expect(getInteractionCursor({ ...idle, target })).toBe(expected);
});

test.each(['empty', 'move', 'resize'] as const)(
    'Shift takes hover precedence over %s and selection modifiers',
    (target) => {
        expect(
            getInteractionCursor({
                ...idle,
                target,
                shiftKey: true,
                ctrlKey: true,
                metaKey: true,
            }),
        ).toBe('grab');
    },
);

test.each(['ctrlKey', 'metaKey'] as const)(
    '%s advertises selection on notes and marquee on empty grid',
    (modifier) => {
        for (const target of ['move', 'resize'] as const) {
            expect(
                getInteractionCursor({ ...idle, target, [modifier]: true }),
            ).toBe('pointer');
        }
        expect(getInteractionCursor({ ...idle, [modifier]: true })).toBe(
            'crosshair',
        );
    },
);

test('outside hover remains default despite pressed modifiers', () => {
    expect(
        getInteractionCursor({
            ...idle,
            target: 'outside',
            shiftKey: true,
            ctrlKey: true,
        }),
    ).toBe('default');
});

test.each([
    ['pan', 'grabbing'],
    ['move', 'move'],
    ['resize', 'ew-resize'],
    ['marquee', 'crosshair'],
] as const)(
    'active %s owns its %s cursor across pointer exits and modifier changes',
    (mode, expected) => {
        for (const target of ['empty', 'move', 'resize', 'outside'] as const) {
            for (const shiftKey of [false, true]) {
                expect(
                    getInteractionCursor({
                        ...idle,
                        mode,
                        target,
                        shiftKey,
                        ctrlKey: true,
                        metaKey: true,
                    }),
                ).toBe(expected);
            }
        }
    },
);

test('an active selection press retains its original cursor and defaults to drawing', () => {
    expect(
        getInteractionCursor({
            ...idle,
            mode: 'select',
            target: 'resize',
            shiftKey: true,
        }),
    ).toBe('crosshair');
    expect(
        getInteractionCursor({
            ...idle,
            mode: 'select',
            target: 'empty',
            shiftKey: true,
            selectionCursor: 'pointer',
        }),
    ).toBe('pointer');
});
