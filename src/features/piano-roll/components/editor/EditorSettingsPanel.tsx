import { useState, type ReactNode } from 'react';
import { Settings2, X } from 'lucide-react';
import { Tabs } from 'radix-ui';
import { motion } from 'motion/react';
import { Button } from '@/shared/components/ui/button';
import { usePrefersReducedMotion } from '@/shared/hooks/usePrefersReducedMotion';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetTitle,
    SheetTrigger,
} from '@/shared/components/ui/sheet';
import { MidiExportButton } from '@/features/piano-roll/components/midi/MidiExportButton';
import { MidiImportButton } from '@/features/piano-roll/components/midi/MidiImportButton';
import type { MidiImportOptions } from '@/features/piano-roll/hooks/midi/useMidiImport';

const tabClass =
    'min-h-9 flex-1 border-b-2 border-transparent px-4 text-sm font-bold text-muted-foreground transition-colors duration-200 data-[state=active]:text-foreground focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none';

export function EditorSettingsPanel({
    sampleControls,
    ...midiOptions
}: MidiImportOptions & { sampleControls?: ReactNode }) {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('midi');
    const reducedMotion = usePrefersReducedMotion();
    const transition = {
        duration: reducedMotion ? 0 : 0.28,
        ease: [0.22, 1, 0.36, 1] as const,
    };
    const panels = [
        {
            value: 'midi',
            content: (
                <section aria-label="MIDI files" className="space-y-3 p-4">
                    <MidiExportButton />
                    <MidiImportButton {...midiOptions} />
                </section>
            ),
        },
        { value: 'instrument', content: sampleControls },
    ];

    return (
        <Sheet
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (nextOpen) setActiveTab('midi');
            }}
        >
            <SheetTrigger asChild>
                <Button type="button" variant="outline">
                    <Settings2 aria-hidden="true" />
                    Settings
                </Button>
            </SheetTrigger>
            <SheetContent open={open} aria-modal="true">
                <header className="shrink-0 border-b-2 border-border p-4">
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
                <Tabs.Root
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <Tabs.List
                        aria-label="Settings sections"
                        className="relative flex shrink-0 border-b border-border"
                    >
                        <Tabs.Trigger value="midi" className={tabClass}>
                            MIDI
                        </Tabs.Trigger>
                        <Tabs.Trigger value="instrument" className={tabClass}>
                            Instrument
                        </Tabs.Trigger>
                        <motion.span
                            aria-hidden="true"
                            className="pointer-events-none absolute bottom-0 left-0 h-0.5 w-1/2 bg-primary"
                            initial={false}
                            animate={{
                                x: activeTab === 'midi' ? '0%' : '100%',
                            }}
                            transition={transition}
                        />
                    </Tabs.List>
                    <div className="relative min-h-0 flex-1 overflow-hidden">
                        {panels.map(({ value, content }) => (
                            <Tabs.Content
                                key={value}
                                value={value}
                                tabIndex={-1}
                                forceMount
                                asChild
                            >
                                <motion.div
                                    className="absolute inset-0 overflow-hidden focus-visible:outline-2 focus-visible:outline-ring"
                                    inert={activeTab !== value}
                                    aria-hidden={activeTab !== value}
                                    style={{
                                        visibility:
                                            activeTab === value
                                                ? 'visible'
                                                : 'hidden',
                                    }}
                                    initial={false}
                                    animate={{
                                        opacity: activeTab === value ? 1 : 0,
                                    }}
                                    transition={transition}
                                >
                                    {content}
                                </motion.div>
                            </Tabs.Content>
                        ))}
                    </div>
                </Tabs.Root>
            </SheetContent>
        </Sheet>
    );
}
