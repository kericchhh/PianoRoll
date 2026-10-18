import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { PIANO_SAMPLE_URLS } from '@/features/piano-roll/audio/pianoSamples';
import type { CustomInstrument } from '@/features/piano-roll/audio/customInstrument';
import { createFxChain } from '@/features/piano-roll/audio/createFxChain';
import { useFxStore } from '@/features/piano-roll/store/useFxStore';
import { toast } from 'sonner';

export function usePianoSampler(sample: CustomInstrument | null = null) {
    const samplerRef = useRef<Tone.Sampler | null>(null);
    const previewSamplerRef = useRef<Tone.Sampler | null>(null);
    const buffersRef = useRef<Record<string, Tone.ToneAudioBuffer> | null>(
        null,
    );
    const waveformRef = useRef<Tone.Waveform | null>(null);
    const fxInputRef = useRef<Tone.ToneAudioNode | null>(null);
    const getWaveformSamples = useCallback(
        () => waveformRef.current?.getValue() ?? null,
        [],
    );
    const getPreviewSampler = useCallback(() => {
        if (!samplerRef.current?.loaded || !buffersRef.current) return null;
        if (!previewSamplerRef.current) {
            const preview = new Tone.Sampler({
                urls: buffersRef.current,
                release: 0.15,
            });
            if (fxInputRef.current) preview.connect(fxInputRef.current);
            previewSamplerRef.current = preview;
        }
        return previewSamplerRef.current;
    }, []);
    const [sampleStatus, setSampleStatus] = useState<{
        source: CustomInstrument | null;
        state: 'loading' | 'ready' | 'error';
    }>({ source: sample, state: 'loading' });

    useEffect(() => {
        let active = true;
        const onerror = () => {
            if (active) setSampleStatus({ source: sample, state: 'error' });
        };
        const baseUrl = `${import.meta.env.BASE_URL}audio/piano/`;
        const buffers = sample
            ? Object.fromEntries(
                  sample.samples.map(({ rootPitch, buffer }) => [
                      String(rootPitch),
                      new Tone.ToneAudioBuffer(buffer),
                  ]),
              )
            : Object.fromEntries(
                  Object.entries(PIANO_SAMPLE_URLS).map(([pitch, url]) => [
                      pitch,
                      new Tone.ToneAudioBuffer({ url: baseUrl + url, onerror }),
                  ]),
              );
        const waveform = new Tone.Waveform(512);
        const fxChain = createFxChain(
            waveform,
            useFxStore.getState().settings,
            () => {
                const { settings, setSettings } = useFxStore.getState();
                if (settings.reverb.enabled)
                    setSettings({
                        ...settings,
                        reverb: { ...settings.reverb, enabled: false },
                    });
                toast.error('Reverb could not start.', { id: 'fx-reverb' });
            },
        );
        const sampler = new Tone.Sampler({
            urls: buffers,
            baseUrl,
            release: 1,
            onload: () => {
                if (active) setSampleStatus({ source: sample, state: 'ready' });
            },
            onerror,
        });
        sampler.connect(fxChain.input);
        const unsubscribeFx = useFxStore.subscribe((state) =>
            fxChain.apply(state.settings),
        );
        samplerRef.current = sampler;
        buffersRef.current = buffers;
        waveformRef.current = waveform;
        fxInputRef.current = fxChain.input;

        return () => {
            active = false;
            samplerRef.current = null;
            buffersRef.current = null;
            waveformRef.current = null;
            fxInputRef.current = null;
            unsubscribeFx();
            previewSamplerRef.current?.dispose();
            previewSamplerRef.current = null;
            sampler.dispose();
            fxChain.dispose();
            waveform.dispose();
            for (const buffer of Object.values(buffers)) buffer.dispose();
        };
    }, [sample]);

    return {
        samplerRef,
        getPreviewSampler,
        getWaveformSamples,
        samplesReady:
            sampleStatus.source === sample && sampleStatus.state === 'ready',
        samplesFailed:
            sampleStatus.source === sample && sampleStatus.state === 'error',
    };
}
