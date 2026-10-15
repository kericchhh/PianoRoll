import { Button } from '@/shared/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

type Props = {
    zoomIn: () => void;
    zoomOut: () => void;
    panLeft: () => void;
    panRight: () => void;
};

export function ViewportControls({
    zoomIn,
    zoomOut,
    panLeft,
    panRight,
}: Props) {
    return (
        <div
            role="group"
            aria-label="Timeline view"
            className="grid grid-cols-2 gap-2"
        >
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="bg-popover"
                aria-label="Zoom out"
                title="Zoom out"
                onClick={zoomOut}
            >
                <ZoomOut aria-hidden="true" />
            </Button>
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="bg-popover"
                aria-label="Zoom in"
                title="Zoom in"
                onClick={zoomIn}
            >
                <ZoomIn aria-hidden="true" />
            </Button>
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="bg-popover"
                aria-label="Pan left"
                title="Pan left"
                onClick={panLeft}
            >
                <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="bg-popover"
                aria-label="Pan right"
                title="Pan right"
                onClick={panRight}
            >
                <ChevronRight aria-hidden="true" />
            </Button>
        </div>
    );
}
