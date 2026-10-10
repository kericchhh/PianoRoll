const META_LENGTHS: Readonly<Record<number, readonly number[]>> = {
    0x00: [2],
    0x20: [1],
    0x21: [1],
    0x2f: [0],
    0x51: [3],
    0x54: [5],
    0x58: [2, 4],
    0x59: [2],
};

export function validateMidiTrack(bytes: Uint8Array): number {
    let offset = 0;
    let runningStatus = 0;
    let noteCount = 0;
    let tick = 0;
    let ended = false;
    const invalid = () =>
        new Error('The MIDI file has an invalid or incomplete event.');
    function readByte(): number {
        if (offset >= bytes.length) throw invalid();
        return bytes[offset++];
    }
    function readVariableLength(): number {
        let value = 0;
        for (let index = 0; index < 4; index++) {
            const byte = readByte();
            value = value * 128 + (byte & 127);
            if (!(byte & 128)) return value;
        }
        throw invalid();
    }

    while (offset < bytes.length) {
        tick += readVariableLength();
        if (!Number.isSafeInteger(tick)) throw invalid();
        let status = readByte();
        if (status < 128) {
            if (!runningStatus) throw invalid();
            offset--;
            status = runningStatus;
        }
        if (status === 0xff || status === 0xf0 || status === 0xf7) {
            runningStatus = 0;
            const metaType = status === 0xff ? readByte() : null;
            if (metaType !== null && metaType >= 128) throw invalid();
            const length = readVariableLength();
            if (offset + length > bytes.length) throw invalid();
            const lengths =
                metaType === null ? undefined : META_LENGTHS[metaType];
            if (lengths && !lengths.includes(length)) throw invalid();
            if (
                metaType === 0x51 &&
                bytes[offset] === 0 &&
                bytes[offset + 1] === 0 &&
                bytes[offset + 2] === 0
            )
                throw invalid();
            if (metaType === 0x2f) {
                if (length !== 0 || offset !== bytes.length) throw invalid();
                ended = true;
            }
            offset += length;
        } else {
            if (status < 0x80 || status > 0xef) throw invalid();
            runningStatus = status;
            const first = readByte();
            const type = status >> 4;
            const second = type === 0xc || type === 0xd ? 0 : readByte();
            if (first > 127 || second > 127) throw invalid();
            if (type === 0x9 && second > 0) noteCount++;
        }
    }
    if (!ended) throw invalid();
    return noteCount;
}
