import type { RefObject } from 'react';
import type {
    PianoRollView,
    Note,
    MarqueeRect,
} from '@/features/piano-roll/types';
import type { NoteRegion } from '@/features/piano-roll/types';

export type NoteInteractionOptions = {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    width: number;
    height: number;
    getView: () => PianoRollView;
    endTick: number;
    dragCandidateRef: RefObject<Note | null>;
    previewRef: RefObject<Record<string, Note> | null>;
    marqueeRef: RefObject<MarqueeRect | null>;
    requestRedraw: () => void;
    onReveal?: (notes: readonly Note[]) => void;
    queryNotes?: (region: NoteRegion) => Note[];
    surfaceRef?: RefObject<HTMLDivElement | null>;
    editorRef?: RefObject<HTMLDivElement | null>;
    onTogglePlayback?: () => void;
};

export type NoteEditCommit = (
    originals: readonly Note[],
    edited: readonly Note[],
) => void;
