import type { ReactNode } from 'react';
import { EditorToolbar } from '@/features/piano-roll/components/toolbar/EditorToolbar';
import { EditorPlaybackPanel } from '@/features/piano-roll/components/playback/EditorPlaybackPanel';

type Props = {
    timeline: ReactNode;
    snapControl?: ReactNode;
    tempoControl?: ReactNode;
    insertionForm: ReactNode;
    historyControls: ReactNode;
    settingsControls: ReactNode;
    playbackControls?: ReactNode;
    playbackWaveform?: ReactNode;
};

export function EditorHeader({
    timeline,
    snapControl,
    tempoControl,
    insertionForm,
    historyControls,
    settingsControls,
    playbackControls,
    playbackWaveform,
}: Props) {
    return (
        <header className="editor-toolbar border-b-2 border-border bg-secondary">
            <EditorToolbar
                timeline={timeline}
                snapControl={snapControl}
                insertionForm={insertionForm}
                historyControls={historyControls}
                settingsControls={settingsControls}
            />
            <EditorPlaybackPanel
                waveform={playbackWaveform}
                tempoControl={tempoControl}
            >
                {playbackControls}
            </EditorPlaybackPanel>
        </header>
    );
}
