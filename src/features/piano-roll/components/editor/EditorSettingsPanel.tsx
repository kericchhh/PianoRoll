import { useState } from 'react';
import { Settings2, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetTitle,
    SheetTrigger,
} from '@/shared/components/ui/sheet';
import { MidiExportButton } from '@/features/piano-roll/components/midi/MidiExportButton';

export function EditorSettingsPanel() {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button type="button" variant="outline">
                    <Settings2 aria-hidden="true" />
                    Settings
                </Button>
            </SheetTrigger>
            <SheetContent open={open} aria-modal="true">
                <header className="border-b-2 border-border p-4">
                    <div className="flex items-center justify-between gap-4">
                        <SheetTitle className="text-xl font-bold">
                            Settings
                        </SheetTitle>
                        <SheetClose asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Close settings"
                            >
                                <X aria-hidden="true" />
                            </Button>
                        </SheetClose>
                    </div>
                    <SheetDescription className="mt-2 text-sm text-muted-foreground">
                        Manage your project files.
                    </SheetDescription>
                </header>
                <section aria-label="MIDI files" className="p-4">
                    <h2 className="mb-3 font-bold">MIDI</h2>
                    <MidiExportButton />
                </section>
            </SheetContent>
        </Sheet>
    );
}
