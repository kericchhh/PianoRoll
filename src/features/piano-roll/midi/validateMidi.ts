import { MAX_MIDI_BYTES, MAX_MIDI_NOTES } from './importLimits';
import { validateMidiTrack } from './validateMidiTrack';

export function validateMidi(bytes: Uint8Array): void {
    if (bytes.length > MAX_MIDI_BYTES)
        throw new Error('Choose a MIDI file no larger than 2 MB.');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (
        bytes.length < 14 ||
        view.getUint32(0) !== 0x4d546864 ||
        view.getUint32(4) !== 6
    )
        throw new Error('Choose a valid .mid or .midi file.');
    const format = view.getUint16(8);
    const tracks = view.getUint16(10);
    const division = view.getUint16(12);
    if (format > 1)
        throw new Error('MIDI format 2 is not supported. Use format 0 or 1.');
    if (division === 0 || division & 0x8000)
        throw new Error('Use a MIDI file with PPQ timing, not SMPTE timing.');
    if (tracks === 0 || (format === 0 && tracks !== 1))
        throw new Error('The MIDI track header is invalid.');
    let offset = 14;
    let noteCount = 0;
    for (let index = 0; index < tracks; index++) {
        if (offset + 8 > bytes.length || view.getUint32(offset) !== 0x4d54726b)
            throw new Error(
                'The MIDI file has an invalid or incomplete track.',
            );
        const start = offset + 8;
        offset = start + view.getUint32(offset + 4);
        if (offset > bytes.length)
            throw new Error('The MIDI file has an incomplete track.');
        noteCount += validateMidiTrack(bytes.subarray(start, offset));
        if (noteCount > MAX_MIDI_NOTES)
            throw new Error('Choose a MIDI file with at most 10,000 notes.');
    }
    if (offset !== bytes.length)
        throw new Error('The MIDI file has unexpected trailing data.');
}
