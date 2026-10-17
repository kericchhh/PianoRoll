import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BpmInput } from '@/features/piano-roll/components/playback/BpmInput';

afterEach(cleanup);

test('an external tempo restore clears the previous committed draft without moving focus or reapplying it on blur', () => {
    const onCommit = vi.fn(() => true);
    const { rerender } = render(<BpmInput value={120} onCommit={onCommit} />);
    const input = screen.getByRole<HTMLInputElement>('spinbutton', {
        name: 'BPM',
    });
    input.focus();
    fireEvent.change(input, { target: { value: '150' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(150);
    rerender(<BpmInput value={150} onCommit={onCommit} />);
    expect(input.value).toBe('150');
    rerender(<BpmInput value={120} onCommit={onCommit} />);
    expect(input.value).toBe('120');
    expect(document.activeElement).toBe(input);
    onCommit.mockClear();
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(120);
    expect(input.value).toBe('120');
});

test.each(['150', '301'])(
    'external tempo changes cannot resurrect draft %s or its validation error',
    (draft) => {
        const onCommit = vi.fn(() => true);
        const { rerender } = render(
            <BpmInput value={120} onCommit={onCommit} />,
        );
        const input = screen.getByRole<HTMLInputElement>('spinbutton', {
            name: 'BPM',
        });
        fireEvent.change(input, { target: { value: draft } });
        if (draft === '301') {
            fireEvent.keyDown(input, { key: 'Enter' });
            expect(input.getAttribute('aria-invalid')).toBe('true');
        }
        rerender(<BpmInput value={93} onCommit={onCommit} />);
        expect(input.value).toBe('93');
        rerender(<BpmInput value={120} onCommit={onCommit} />);
        expect(input.value).toBe('120');
        expect(input.getAttribute('aria-invalid')).toBe('false');
        expect(screen.queryByRole('alert')).toBeNull();
        expect(onCommit).not.toHaveBeenCalled();
    },
);
