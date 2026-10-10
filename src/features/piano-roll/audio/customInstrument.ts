import type { CustomSample } from './customSample';
import { validateSampleFile } from './customSample';
import { samplePitch } from './samplePitch';

export type CustomInstrument = {
    name: string;
    samples: readonly CustomSample[];
};
export type InstrumentFile = {
    id: string;
    file: File;
    rootPitch: number | null;
};
export type InstrumentDraft = {
    name: string;
    files: readonly InstrumentFile[];
};
export const MAX_INSTRUMENT_FILES = 128;
export const MAX_INSTRUMENT_BYTES = 200 * 1024 * 1024;
export const MAX_DECODED_INSTRUMENT_BYTES = 256 * 1024 * 1024;

export function validateInstrumentFiles(
    files: readonly InstrumentFile[],
): void {
    if (!files.length)
        throw new RangeError('Choose a folder containing audio samples.');
    if (files.length > MAX_INSTRUMENT_FILES)
        throw new RangeError(
            'Choose up to 128 audio samples for one instrument.',
        );
    let bytes = 0;
    for (const { file } of files) {
        validateSampleFile(file.size);
        bytes += file.size;
    }
    if (bytes > MAX_INSTRUMENT_BYTES)
        throw new RangeError(
            'The instrument folder must contain no more than 200 MB of audio.',
        );
}

export function prepareInstrumentFolder(
    files: readonly File[],
): InstrumentDraft {
    const audio = files.filter((file) => {
        const path = file.webkitRelativePath || file.name;
        if (
            path
                .split('/')
                .some((part) => part.startsWith('.') || part === '__MACOSX')
        )
            return false;
        return (
            file.type.startsWith('audio/') ||
            /\.(wav|mp3|ogg|flac|m4a|aif|aiff|aac|opus|webm|mp4)$/i.test(
                file.name,
            )
        );
    });
    const entries = audio
        .map((file) => ({
            id: file.webkitRelativePath || file.name,
            file,
            rootPitch: samplePitch(file.name),
        }))
        .sort((a, b) => a.id.localeCompare(b.id));
    validateInstrumentFiles(entries);
    return {
        name: audio[0].webkitRelativePath.split('/')[0] || 'Custom instrument',
        files: entries,
    };
}

export function validateInstrumentMapping(
    files: readonly InstrumentFile[],
): void {
    validateInstrumentFiles(files);
    const pitches = new Set<number>();
    for (const entry of files) {
        const pitch = entry.rootPitch;
        if (
            pitch === null ||
            !Number.isInteger(pitch) ||
            pitch < 0 ||
            pitch > 127
        )
            throw new RangeError(
                `Assign a MIDI pitch from 0 to 127 to ${entry.file.name}.`,
            );
        if (pitches.has(pitch))
            throw new RangeError(
                `More than one sample uses MIDI pitch ${pitch}. Change a pitch or remove a duplicate.`,
            );
        pitches.add(pitch);
    }
    if (Math.min(...pitches) > 95 || Math.max(...pitches) < 32)
        throw new RangeError(
            'Add or assign a sample between MIDI 32 and 95, or combine low and high samples, to cover every editor key.',
        );
}
