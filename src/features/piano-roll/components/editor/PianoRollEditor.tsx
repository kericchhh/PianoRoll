import { useState, type ReactNode } from 'react';
import {
    BEATS_PER_BAR,
    INITIAL_BAR_COUNT,
    PPQ,
} from '@/features/piano-roll/constants';
import { usePianoRollEditor } from '@/features/piano-roll/hooks/editor/usePianoRollEditor';
import { EditorHeader } from '@/features/piano-roll/components/editor/EditorHeader';
import { EditorFooter } from '@/features/piano-roll/components/editor/EditorFooter';
import { PianoRollMain } from '@/features/piano-roll/components/editor/PianoRollMain';
import { TimelineLengthSelect } from '@/features/piano-roll/components/toolbar/TimelineLengthSelect';
import { NoteInsertionForm } from '@/features/piano-roll/components/notes/NoteInsertionForm';
import { PlayheadCanvas } from '@/features/piano-roll/components/playback/PlayheadCanvas';
import type { PlaybackState } from '@/features/piano-roll/audio/playbackTypes';
import { HistoryControls } from '@/features/piano-roll/components/toolbar/HistoryControls';

type Props = {
    playbackControls?: ReactNode;
    onTogglePlayback?: () => void;
    getPlaybackTick?: () => number;
    playbackState?: PlaybackState;
    playbackWaveform?: ReactNode;
};

export function PianoRollEditor({
    playbackControls,
    onTogglePlayback,
    getPlaybackTick,
    playbackState = 'stopped',
    playbackWaveform,
}: Props) {
    const [barCount, setBarCount] = useState(INITIAL_BAR_COUNT);
    const endTick = barCount * BEATS_PER_BAR * PPQ;
    const editor = usePianoRollEditor(endTick, onTogglePlayback);

    return (
        <section
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border border-border bg-background"
            aria-label="Piano roll workspace"
        >
            <EditorHeader
                historyControls={
                    <HistoryControls
                        onUndo={editor.interactions.undo}
                        onRedo={editor.interactions.redo}
                        onKeyDown={editor.interactions.handleEditorKeyDown}
                    />
                }
                playbackControls={playbackControls}
                playbackWaveform={playbackWaveform}
                timeline={
                    <TimelineLengthSelect
                        value={barCount}
                        onValueChange={setBarCount}
                    />
                }
                insertionForm={
                    <NoteInsertionForm
                        endTick={endTick}
                        onAdd={editor.interactions.addNote}
                    />
                }
            />
            <PianoRollMain
                editor={editor}
                playhead={
                    getPlaybackTick && (
                        <PlayheadCanvas
                            editor={editor}
                            playbackState={playbackState}
                            getPlaybackTick={getPlaybackTick}
                        />
                    )
                }
            />
            <EditorFooter />
        </section>
    );
}
