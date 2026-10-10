import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { PIANO_SAMPLE_URLS } from '@/features/piano-roll/audio/pianoSamples';

export function usePianoSampler() {
    const samplerRef = useRef<Tone.Sampler | null>(null);
    const previewSamplerRef = useRef<Tone.Sampler | null>(null);
    const buffersRef = useRef<Record<string, Tone.ToneAudioBuffer> | null>(
        null,
    );
    const waveformRef = useRef<Tone.Waveform | null>(null);
    const getWaveformSamples = useCallback(
        () => waveformRef.current?.getValue() ?? null,
        [],
    );
    const getPreviewSampler = useCallback(() => {
        if (!samplerRef.current?.loaded || !buffersRef.current) return null;
        if (!previewSamplerRef.current) {
            previewSamplerRef.current = new Tone.Sampler({
                urls: buffersRef.current,
                release: 0.15,
            }).toDestination();
        }
        return previewSamplerRef.current;
    }, []);
    const [sampleStatus, setSampleStatus] = useState<
        'loading' | 'ready' | 'error'
    >('loading');

    useEffect(() => {
        let active = true;
        const onerror = () => {
            if (active) setSampleStatus('error');
        };
        const baseUrl = `${import.meta.env.BASE_URL}audio/piano/`;
        const buffers = Object.fromEntries(
            Object.entries(PIANO_SAMPLE_URLS).map(([pitch, url]) => [
                pitch,
                new Tone.ToneAudioBuffer({ url: baseUrl + url, onerror }),
            ]),
        );
        const sampler = new Tone.Sampler({
            urls: buffers,
            baseUrl,
            release: 1,
            onload: () => {
                if (active) setSampleStatus('ready');
            },
            onerror,
        }).toDestination();
        const waveform = new Tone.Waveform(512);
        sampler.connect(waveform);
        samplerRef.current = sampler;
        buffersRef.current = buffers;
        waveformRef.current = waveform;

        return () => {
            active = false;
            samplerRef.current = null;
            buffersRef.current = null;
            waveformRef.current = null;
            previewSamplerRef.current?.dispose();
            previewSamplerRef.current = null;
            sampler.dispose();
            waveform.dispose();
            for (const buffer of Object.values(buffers)) buffer.dispose();
        };
    }, []);

    return {
        samplerRef,
        getPreviewSampler,
        getWaveformSamples,
        samplesReady: sampleStatus === 'ready',
        samplesFailed: sampleStatus === 'error',
    };
}
