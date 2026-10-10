import {
    MAX_DECODED_INSTRUMENT_BYTES,
    validateInstrumentMapping,
    type CustomInstrument,
    type InstrumentDraft,
} from './customInstrument';
import { validateSampleBuffer, type CustomSample } from './customSample';

type Options = {
    decode: (bytes: ArrayBuffer) => Promise<AudioBuffer>;
    isCurrent: () => boolean;
    onProgress: (count: number) => void;
    waitForDecoder?: () => Promise<void>;
};

export async function decodeInstrument(
    draft: InstrumentDraft,
    { decode, isCurrent, onProgress, waitForDecoder }: Options,
): Promise<CustomInstrument | null> {
    validateInstrumentMapping(draft.files);
    const samples: CustomSample[] = [];
    let decodedBytes = 0;
    // Decode sequentially so a folder cannot start hundreds of decoders at once.
    for (const { file, rootPitch } of draft.files) {
        if (!isCurrent()) return null;
        await waitForDecoder?.();
        if (!isCurrent()) return null;
        const bytes = await file.arrayBuffer();
        if (!isCurrent()) return null;
        let buffer: AudioBuffer;
        try {
            buffer = await decode(bytes);
        } catch {
            if (!isCurrent()) return null;
            throw new RangeError(
                `Could not decode ${file.name}. Try another browser-supported audio file.`,
            );
        }
        if (!isCurrent()) return null;
        validateSampleBuffer(buffer);
        decodedBytes += buffer.length * buffer.numberOfChannels * 4;
        if (decodedBytes > MAX_DECODED_INSTRUMENT_BYTES)
            throw new RangeError(
                'The decoded instrument exceeds 256 MB. Choose fewer or shorter samples.',
            );
        samples.push({ name: file.name, rootPitch: rootPitch!, buffer });
        onProgress(samples.length);
    }
    return { name: draft.name, samples };
}
