export const MIDI_FILENAME = 'piano-roll.mid';

export function downloadMidi(bytes: Uint8Array): void {
    const anchor = document.createElement('a');
    const blob = new Blob([new Uint8Array(bytes).buffer], {
        type: 'audio/midi',
    });
    const url = URL.createObjectURL(blob);
    try {
        anchor.href = url;
        anchor.download = MIDI_FILENAME;
        anchor.hidden = true;
        document.body.append(anchor);
        anchor.click();
    } finally {
        anchor.remove();
        // Allow the browser to begin consuming the download before releasing it.
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}
