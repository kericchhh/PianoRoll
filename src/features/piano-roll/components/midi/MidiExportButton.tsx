import { Download } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useMidiExport } from '@/features/piano-roll/hooks/midi/useMidiExport';

export function MidiExportButton() {
    const { exportMidi, isExporting } = useMidiExport();
    return (
        <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            aria-busy={isExporting}
            aria-disabled={isExporting}
            onClick={exportMidi}
        >
            <Download aria-hidden="true" />
            Export MIDI
        </Button>
    );
}
