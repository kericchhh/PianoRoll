import { useEffect, useState } from 'react';
import { AudioLines, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetTitle,
    SheetTrigger,
} from '@/shared/components/ui/sheet';
import { FxPanel } from '@/features/piano-roll/components/fx/FxPanel';

export function FxDrawer() {
    const [open, setOpen] = useState(false);
    useEffect(() => {
        const desktop = window.matchMedia?.('(min-width: 1024px)');
        if (!desktop) return;
        const closeAtDesktop = () => {
            if (desktop.matches) setOpen(false);
        };
        desktop.addEventListener('change', closeAtDesktop);
        return () => desktop.removeEventListener('change', closeAtDesktop);
    }, []);

    return (
        <div className="lg:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="FX"
                        title="FX"
                    >
                        <AudioLines aria-hidden="true" />
                    </Button>
                </SheetTrigger>
                <SheetContent
                    open={open}
                    side="right"
                    aria-modal="true"
                    className="overflow-y-auto"
                >
                    <SheetTitle className="sr-only">FX</SheetTitle>
                    <SheetDescription className="sr-only">
                        Reverb, delay, and chorus controls.
                    </SheetDescription>
                    <SheetClose asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 z-10"
                            aria-label="Close FX"
                        >
                            <X aria-hidden="true" />
                        </Button>
                    </SheetClose>
                    <FxPanel />
                </SheetContent>
            </Sheet>
        </div>
    );
}
