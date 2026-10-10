import type { ReactNode } from 'react';
import type { PianoRollEditorModel } from '@/features/piano-roll/hooks/editor/usePianoRollEditor';
import { RULER_HEIGHT } from '@/features/piano-roll/constants';
import { PianoKeys } from '@/features/piano-roll/components/grid/PianoKeys';
import { PianoRollRuler } from '@/features/piano-roll/components/grid/PianoRollRuler';
import { PianoRollSurface } from '@/features/piano-roll/components/grid/PianoRollSurface';
import { StudioSidebar } from '@/features/piano-roll/components/editor/StudioSidebar';

export function PianoRollMain({
    editor,
    playhead,
    onPreviewPitch,
}: {
    editor: PianoRollEditorModel;
    playhead?: ReactNode;
    onPreviewPitch?: (pitch: number) => void;
}) {
    return (
        <div className="workspace-grid min-h-0 flex-1">
            <div
                className="flex items-center justify-center border-r border-b border-border bg-secondary text-xs text-muted-foreground"
                style={{ height: RULER_HEIGHT }}
            >
                Keys
            </div>
            <PianoRollRuler rulerRef={editor.rulerRef} />
            <div className="min-h-0 overflow-hidden border-r border-border">
                <PianoKeys
                    highestPitch={editor.viewport.highestPitch}
                    height={editor.viewport.height}
                    onPreview={onPreviewPitch}
                    onScrollPitch={editor.viewport.scrollPitch}
                    gestureModeRef={editor.interactions.gestureModeRef}
                />
            </div>
            <PianoRollSurface editor={editor} playhead={playhead} />
            <StudioSidebar />
        </div>
    );
}
