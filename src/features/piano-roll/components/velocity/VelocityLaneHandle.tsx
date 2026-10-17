import { ChevronDown, ChevronUp, GripHorizontal } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { useVelocityPanel } from '@/features/piano-roll/hooks/velocity/useVelocityPanel';

export function VelocityLaneHandle({
    panel,
    bodyId,
}: {
    panel: ReturnType<typeof useVelocityPanel>;
    bodyId: string;
}) {
    const {
        handleRef,
        maximum,
        height,
        open,
        handleKeyDown,
        handleClick,
        clearClick,
        toggle,
    } = panel;
    return (
        <div className="flex h-6 shrink-0 items-stretch border-t border-border bg-secondary">
            <div
                ref={handleRef}
                role="separator"
                aria-label="Resize velocity lane"
                aria-orientation="horizontal"
                aria-controls={bodyId}
                aria-valuemin={0}
                aria-valuemax={Math.round(maximum)}
                aria-valuenow={Math.round(height)}
                aria-valuetext={
                    open ? `${Math.round(height)} pixels` : 'Collapsed'
                }
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onClick={handleClick}
                onPointerDownCapture={clearClick}
                className="flex min-w-0 flex-1 cursor-row-resize touch-none items-center justify-center gap-2 text-xs text-muted-foreground select-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
                <GripHorizontal aria-hidden="true" className="size-4" />
                Velocity
            </div>
            <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Toggle velocity lane"
                aria-expanded={open}
                aria-controls={bodyId}
                aria-disabled={maximum === 0}
                onClick={toggle}
            >
                {open ? (
                    <ChevronDown aria-hidden="true" />
                ) : (
                    <ChevronUp aria-hidden="true" />
                )}
            </Button>
        </div>
    );
}
