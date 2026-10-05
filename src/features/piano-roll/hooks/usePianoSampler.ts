import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { PIANO_SAMPLE_URLS } from '@/features/piano-roll/audio/pianoSamples';

export function usePianoSampler() {
    const samplerRef = useRef<Tone.Sampler | null>(null);
    const [sampleStatus, setSampleStatus] = useState<
        'loading' | 'ready' | 'error'
    >('loading');

    useEffect(() => {
        let active = true;
        const sampler = new Tone.Sampler({
            urls: PIANO_SAMPLE_URLS,
            baseUrl: `${import.meta.env.BASE_URL}audio/piano/`,
            release: 1,
            onload: () => {
                if (active) setSampleStatus('ready');
            },
            onerror: () => {
                if (active) setSampleStatus('error');
            },
        }).toDestination();
        samplerRef.current = sampler;

        return () => {
            active = false;
            samplerRef.current = null;
            sampler.dispose();
        };
    }, []);

    return {
        samplerRef,
        samplesReady: sampleStatus === 'ready',
        samplesFailed: sampleStatus === 'error',
    };
}
