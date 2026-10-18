import { useContext, useEffect, useRef } from 'react';
import { peakDb, segmentsForDb } from '@/features/piano-roll/audio/outputLevel';
import { FxAudioContext } from '@/features/piano-roll/components/fx/FxAudioContext';

const SEGMENTS = Array.from({ length: 12 }, (_, index) => index);

export function OutputMeter() {
    const getSamples = useContext(FxAudioContext);
    const meterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!getSamples) return;
        const meter = meterRef.current;
        if (!meter) return;
        const segments =
            meter.querySelectorAll<HTMLElement>('.fx-meter-segment');
        let lit = 0;
        let nextAccessibleUpdate = Date.now() + 1000;
        const readLevel = () => {
            if (document.visibilityState === 'hidden') return;
            const db = peakDb(getSamples());
            const nextLit = segmentsForDb(db);
            if (nextLit !== lit) {
                segments.forEach((segment, index) => {
                    segment.dataset.lit = String(index < nextLit);
                });
                lit = nextLit;
            }
            if (Date.now() >= nextAccessibleUpdate) {
                meter.setAttribute('aria-valuenow', String(Math.round(db)));
                meter.setAttribute(
                    'aria-valuetext',
                    db <= -48 ? 'Silent' : `${Math.round(db)} dBFS`,
                );
                nextAccessibleUpdate = Date.now() + 1000;
            }
        };
        let timer: number | null = null;
        let inView = typeof IntersectionObserver === 'undefined';
        const syncTimer = () => {
            if (inView && document.visibilityState !== 'hidden') {
                if (timer === null) timer = window.setInterval(readLevel, 67);
            } else if (timer !== null) {
                window.clearInterval(timer);
                timer = null;
            }
        };
        const observer =
            typeof IntersectionObserver === 'undefined'
                ? null
                : new IntersectionObserver((entries) => {
                      inView = entries.some((entry) => entry.isIntersecting);
                      syncTimer();
                  });
        observer?.observe(meter);
        document.addEventListener('visibilitychange', syncTimer);
        syncTimer();
        return () => {
            observer?.disconnect();
            document.removeEventListener('visibilitychange', syncTimer);
            if (timer !== null) window.clearInterval(timer);
        };
    }, [getSamples]);

    return (
        <div className="fx-output-meter border-t border-border px-3 pt-3 pb-3">
            <div className="mb-1 flex items-baseline justify-between gap-2">
                <h3 className="text-xs font-bold">Output</h3>
                <span className="text-[10px] text-muted-foreground">dBFS</span>
            </div>
            <div
                ref={meterRef}
                role="meter"
                aria-label="Output peak"
                aria-valuemin={-48}
                aria-valuemax={0}
                aria-valuenow={-48}
                aria-valuetext="Silent"
            >
                <div className="fx-meter-track" aria-hidden="true">
                    {SEGMENTS.map((index) => (
                        <span
                            key={index}
                            className="fx-meter-segment"
                            data-lit="false"
                        />
                    ))}
                </div>
            </div>
            <div className="fx-meter-scale" aria-hidden="true">
                <span>−48</span>
                <span>−24</span>
                <span>−12</span>
                <span>0</span>
            </div>
        </div>
    );
}
