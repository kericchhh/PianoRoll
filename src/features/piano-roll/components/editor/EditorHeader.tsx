import type { ReactNode } from 'react';
import { EditorToolbar } from '@/features/piano-roll/components/toolbar/EditorToolbar';
import { EditorPlaybackPanel } from '@/features/piano-roll/components/playback/EditorPlaybackPanel';

type Props = {
    timeline: ReactNode;
    insertionForm: ReactNode;
    historyControls: ReactNode;
    settingsControls: ReactNode;
    playbackControls?: ReactNode;
    playbackWaveform?: ReactNode;
};

export function EditorHeader({
    timeline,
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
                insertionForm={insertionForm}
                historyControls={historyControls}
                settingsControls={settingsControls}
            />
            <EditorPlaybackPanel waveform={playbackWaveform}>
                {playbackControls}
            </EditorPlaybackPanel>
        </header>
    );
}
