import type { ReactNode } from 'react';
import { SnapIndicator } from '@/features/piano-roll/components/toolbar/SnapIndicator';

type Props = {
    timeline: ReactNode;
    insertionForm: ReactNode;
    historyControls: ReactNode;
};

export function EditorToolbar({
    timeline,
    insertionForm,
    historyControls,
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
            {insertionForm}
        </section>
    );
}
