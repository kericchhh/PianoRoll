const SEMITONES: Readonly<Record<string, number>> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
};

export function samplePitch(filename: string): number | null {
    const stem = filename.replace(/\.[^.]+$/, '');
    const numeric = /^(?:midi[-_ ]?)?(\d{1,3})$/i.exec(stem);
    if (numeric) return Number(numeric[1]) <= 127 ? Number(numeric[1]) : null;
    const notes = [
        ...stem.matchAll(
            /(?:^|[^A-Za-z0-9])([A-G])([#sb]?)(-?\d{1,2})(?=$|[^A-Za-z0-9])/gi,
        ),
    ];
    if (notes.length !== 1) return null;
    const [, letter, accidental, octave] = notes[0];
    const pitch =
        (Number(octave) + 1) * 12 +
        SEMITONES[letter.toUpperCase()] +
        (accidental.toLowerCase() === 'b' ? -1 : accidental ? 1 : 0);
    return pitch >= 0 && pitch <= 127 ? pitch : null;
}
