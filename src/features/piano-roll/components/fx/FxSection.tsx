import type { ReactNode } from 'react';

type Props = {
    name: string;
    enabled: boolean;
    onToggle: () => void;
    children: ReactNode;
};

export function FxSection({ name, enabled, onToggle, children }: Props) {
    return (
        <section
            className="fx-section border-b border-border px-3"
            aria-label={name}
        >
            <div className="fx-section-header flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold">{name}</h3>
                <button
                    type="button"
                    className="fx-toggle"
                    data-enabled={enabled}
                    aria-label={`${enabled ? 'Disable' : 'Enable'} ${name.toLowerCase()}`}
                    aria-pressed={enabled}
                    onClick={onToggle}
                >
                    <span className="fx-toggle-socket" aria-hidden="true">
                        <span className="fx-toggle-lever" />
                    </span>
                    <span className="fx-toggle-lamp" aria-hidden="true" />
                    <span className="sr-only">{enabled ? 'On' : 'Off'}</span>
                </button>
            </div>
            <div className="grid grid-cols-2 gap-2">{children}</div>
        </section>
    );
}
