import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
    BEATS_PER_BAR,
    INITIAL_BAR_COUNT,
    PPQ,
    BAR_COUNTS,
    DEFAULT_BPM,
    DEFAULT_SNAP_TICKS,
    type SnapTicks,
} from '@/features/piano-roll/constants/music';
import { usePianoRollEditor } from '@/features/piano-roll/hooks/editor/usePianoRollEditor';
import { EditorHeader } from '@/features/piano-roll/components/editor/EditorHeader';
import { EditorFooter } from '@/features/piano-roll/components/editor/EditorFooter';
import { PianoRollMain } from '@/features/piano-roll/components/editor/PianoRollMain';
import { TimelineLengthSelect } from '@/features/piano-roll/components/toolbar/TimelineLengthSelect';
import { NoteInsertionForm } from '@/features/piano-roll/components/notes/NoteInsertionForm';
import { PlayheadCanvas } from '@/features/piano-roll/components/playback/PlayheadCanvas';
import type { PlaybackState } from '@/features/piano-roll/audio/playbackTypes';
import { HistoryControls } from '@/features/piano-roll/components/toolbar/HistoryControls';
import { EditorSettingsPanel } from '@/features/piano-roll/components/editor/EditorSettingsPanel';
import type { Note } from '@/features/piano-roll/types';
import { useProjectPersistence } from '@/features/piano-roll/hooks/projects/useProjectPersistence';
import { ProjectPanel } from '@/features/piano-roll/components/projects/ProjectPanel';
import { SnapSelect } from '@/features/piano-roll/components/toolbar/SnapSelect';
import { BpmInput } from '@/features/piano-roll/components/playback/BpmInput';

type Props = {
    bpm?: number;
    onBpmChange?: (bpm: number) => boolean;
    playbackControls?: ReactNode;
    onTogglePlayback?: () => void;
    getPlaybackTick?: () => number;
    playbackState?: PlaybackState;
    playbackWaveform?: ReactNode;
    onPreviewPitch?: (pitch: number) => void;
    onStopPlayback?: () => void;
    sampleControls?: ReactNode;
};

export function PianoRollEditor({
    bpm = DEFAULT_BPM,
    onBpmChange,
    playbackControls,
    onTogglePlayback,
    getPlaybackTick,
    playbackState = 'stopped',
    playbackWaveform,
    onPreviewPitch,
    onStopPlayback,
    sampleControls,
}: Props) {
    const [barCount, setBarCount] = useState(INITIAL_BAR_COUNT);
    const [snapTicks, setSnapTicks] = useState<SnapTicks>(DEFAULT_SNAP_TICKS);
    const endTick = barCount * BEATS_PER_BAR * PPQ;
    const editor = usePianoRollEditor(endTick, onTogglePlayback, snapTicks);
    const { notes: editorNotes, viewport, requestRedraw } = editor;
    const importedNoteRef = useRef<Note | null>(null);
    const projectControls = useProjectPersistence({
        barCount,
        bpm,
        canLoad: () => editor.interactions.gestureModeRef.current === 'idle',
        onBeforeLoad: (project) => {
            editor.setPreserveViewOnStop(
                playbackState !== 'stopped' && !!onStopPlayback,
            );
            if (project.bpm !== bpm && onBpmChange) onBpmChange(project.bpm);
            else onStopPlayback?.();
        },
        onLoaded: (project) => {
            importedNoteRef.current = null;
            setBarCount(project.barCount);
            editor.interactions.activateNote(null);
        },
    });
    useEffect(() => {
        const note = importedNoteRef.current;
        if (!note) return;
        importedNoteRef.current = null;
        viewport.reveal([note]);
        requestRedraw();
    }, [editorNotes, viewport, requestRedraw]);

    return (
        <section
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border border-border bg-background"
            aria-label="Piano roll workspace"
        >
            <EditorHeader
                snapControl={
                    <SnapSelect
                        value={snapTicks}
                        onValueChange={(next) => {
                            if (
                                editor.interactions.gestureModeRef.current !==
                                'idle'
                            ) {
                                editor.interactions.announce(
                                    'Finish the active edit before changing snap.',
                                );
                                return;
                            }
                            setSnapTicks(next);
                            editor.interactions.announce(
                                `Snap set to ${next} ticks`,
                            );
                        }}
                    />
                }
                tempoControl={
                    onBpmChange && (
                        <BpmInput
                            value={bpm}
                            onCommit={(next) => {
                                if (
                                    editor.interactions.gestureModeRef
                                        .current !== 'idle'
                                )
                                    return false;
                                const accepted = onBpmChange(next);
                                if (accepted && next !== bpm)
                                    editor.interactions.announce(
                                        `Tempo set to ${next} BPM. Playback reset.`,
                                    );
                                return accepted;
                            }}
                        />
                    )
                }
                settingsControls={
                    <EditorSettingsPanel
                        sampleControls={sampleControls}
                        projectControls={<ProjectPanel {...projectControls} />}
                        onBeforeImport={onStopPlayback}
                        onImported={(notes, importedEndTick) => {
                            const bars = Math.ceil(
                                importedEndTick / (BEATS_PER_BAR * PPQ),
                            );
                            const nextCount =
                                BAR_COUNTS.find((count) => count >= bars) ?? 32;
                            setBarCount((previous) =>
                                Math.max(previous, nextCount),
                            );
                            importedNoteRef.current = notes[0] ?? null;
                            editor.interactions.activateNote(
                                notes[0]?.id ?? null,
                            );
                            editor.interactions.announce(
                                `Imported ${notes.length} ${notes.length === 1 ? 'note' : 'notes'}. Undo restores the previous composition.`,
                            );
                        }}
                    />
                }
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
                        snapTicks={snapTicks}
                        onAdd={editor.interactions.addNote}
                    />
                }
            />
            <PianoRollMain
                editor={editor}
                onPreviewPitch={onPreviewPitch}
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
