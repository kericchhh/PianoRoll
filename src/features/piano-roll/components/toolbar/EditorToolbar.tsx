import type { ReactNode } from 'react';
import { SnapIndicator } from '@/features/piano-roll/components/toolbar/SnapIndicator';

type Props = {
    timeline: ReactNode;
    insertionForm: ReactNode;
    historyControls: ReactNode;
    settingsControls: ReactNode;
};

export function EditorToolbar({
    timeline,
    insertionForm,
    historyControls,
    settingsControls,
}: Props) {
    return (
        <section aria-label="Toolbox" className="min-w-0 px-4 py-3">
            <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                <h1 className="mr-2 text-2xl leading-none font-bold tracking-tight">
                    Piano roll
                </h1>
                {timeline}
                <SnapIndicator />
                {historyControls}
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {insertionForm}
                {settingsControls}
            </div>
        </section>
    );
}
