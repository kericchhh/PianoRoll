import type { ReactNode } from 'react';
import { FxDrawer } from '@/features/piano-roll/components/fx/FxDrawer';

type Props = {
    timeline: ReactNode;
    snapControl?: ReactNode;
    insertionForm: ReactNode;
    historyControls: ReactNode;
    settingsControls: ReactNode;
};

export function EditorToolbar({
    timeline,
    snapControl,
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
                {snapControl}
                {historyControls}
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {insertionForm}
                <div className="flex items-center gap-2">
                    {settingsControls}
                    <FxDrawer />
                </div>
            </div>
        </section>
    );
}
