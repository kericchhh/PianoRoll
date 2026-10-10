export function getInstrumentStatus(name = 'Piano') {
    const piano = name === 'Piano';
    return {
        ready: `${name} ready`,
        loading: piano ? 'Loading piano samples…' : `Loading ${name}…`,
        loadError: piano
            ? 'Could not load piano samples. Reload to try again.'
            : `Could not load ${name}. Restore piano or import another sample.`,
        previewError: piano
            ? 'Could not preview piano. Press a key to try again.'
            : `Could not preview ${name}. Press a key to try again.`,
    };
}
