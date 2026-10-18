import * as Tone from 'tone';
import type { FxSettings } from '@/features/piano-roll/audio/fxSettings';

export function createFxChain(
    waveform: Tone.Waveform,
    initial: FxSettings,
    onReverbError: () => void,
) {
    const chorus = new Tone.Chorus({
        frequency: 0.8,
        delayTime: 4,
        depth: initial.chorus.depth / 100,
        feedback: 0,
        wet: 0,
    }).start();
    const delay = new Tone.FeedbackDelay({
        delayTime: initial.delay.time / 1000,
        feedback: 0.28,
        maxDelay: 1,
        wet: 0,
    });
    const reverb = new Tone.Reverb({
        decay: initial.reverb.room,
        preDelay: 0.02,
        wet: 0,
    });
    chorus.connect(delay);
    delay.connect(reverb);
    reverb.toDestination();
    reverb.connect(waveform);

    let active = true;
    let ready = false;
    let generation = 0;
    let room = initial.reverb.room;
    let settings = initial;

    function updateWet() {
        chorus.wet.rampTo(
            settings.chorus.enabled ? settings.chorus.mix / 100 : 0,
            0.03,
        );
        delay.wet.rampTo(
            settings.delay.enabled ? settings.delay.mix / 100 : 0,
            0.03,
        );
        reverb.wet.rampTo(
            ready && settings.reverb.enabled ? settings.reverb.mix / 100 : 0,
            0.03,
        );
    }

    function waitForReverb() {
        const current = ++generation;
        void reverb.ready.then(
            () => {
                if (!active || current !== generation) return;
                ready = true;
                updateWet();
            },
            () => {
                if (!active || current !== generation) return;
                onReverbError();
            },
        );
    }

    function apply(next: FxSettings) {
        settings = next;
        chorus.depth = next.chorus.depth / 100;
        delay.delayTime.value = next.delay.time / 1000;
        if (next.reverb.room !== room) {
            room = next.reverb.room;
            ready = false;
            reverb.decay = room;
            waitForReverb();
        }
        updateWet();
    }

    apply(initial);
    waitForReverb();
    return {
        input: chorus,
        apply,
        dispose: () => {
            active = false;
            generation++;
            chorus.dispose();
            delay.dispose();
            reverb.dispose();
        },
    };
}
