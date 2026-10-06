import type { RefObject } from 'react';

type Props = {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    width: number;
    height: number;
};

export function PianoRollCanvas({ canvasRef, width, height }: Props) {
    return (
        <canvas
            ref={canvasRef}
            role="img"
            aria-label="Time grid preview"
            data-logical-width={width}
            data-logical-height={height}
            className="block bg-roll-background select-none"
        />
    );
}
