export function sampleFile(name = 'instrument.wav', pitch = 60, seconds = 1) {
    const rate = 44100;
    const frames = Math.round(rate * seconds);
    const frequency = 440 * 2 ** ((pitch - 69) / 12);
    const wav = Buffer.alloc(44 + frames * 2);
    wav.write('RIFF', 0);
    wav.writeUInt32LE(wav.length - 8, 4);
    wav.write('WAVEfmt ', 8);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(rate, 24);
    wav.writeUInt32LE(rate * 2, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write('data', 36);
    wav.writeUInt32LE(frames * 2, 40);
    for (let index = 0; index < frames; index++)
        wav.writeInt16LE(
            Math.round(
                Math.sin((index * 2 * Math.PI * frequency) / rate) * 4000,
            ),
            44 + index * 2,
        );
    return { name, mimeType: 'audio/wav', buffer: wav };
}
