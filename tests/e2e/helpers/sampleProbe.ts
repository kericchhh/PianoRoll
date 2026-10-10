import type { Page } from '@playwright/test';

type SampleProbe = { rates: number[]; buffers: number[]; durations: number[] };
type ProbeWindow = Window & { __sampleProbe?: SampleProbe };

export async function installSampleProbe(page: Page, durations = [1]) {
    await page.addInitScript((includedDurations) => {
        const probe: SampleProbe = { rates: [], buffers: [], durations: [] };
        (window as ProbeWindow).__sampleProbe = probe;
        const seen = new WeakMap<AudioBuffer, number>();
        const scheduledValues = new WeakMap<AudioParam, number>();
        const setValue = AudioParam.prototype.setValueAtTime;
        AudioParam.prototype.setValueAtTime = function (value, time) {
            scheduledValues.set(this, value);
            return setValue.call(this, value, time);
        };
        let nextId = 0;
        const originalStart = AudioBufferSourceNode.prototype.start;
        AudioBufferSourceNode.prototype.start = function (...args) {
            if (
                this.buffer &&
                includedDurations.includes(this.buffer.duration)
            ) {
                if (!seen.has(this.buffer)) seen.set(this.buffer, nextId++);
                probe.rates.push(
                    scheduledValues.get(this.playbackRate) ??
                        this.playbackRate.value,
                );
                probe.buffers.push(seen.get(this.buffer)!);
                probe.durations.push(this.buffer.duration);
            }
            originalStart.apply(this, args);
        };
    }, durations);
}

export function sampleProbe(page: Page) {
    return page.evaluate(() => (window as ProbeWindow).__sampleProbe!);
}
