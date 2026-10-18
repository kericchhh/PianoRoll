import { createContext } from 'react';

export const FxAudioContext = createContext<(() => Float32Array | null) | null>(
    null,
);
