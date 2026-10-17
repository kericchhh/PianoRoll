import { useEffect, useMemo, useState } from 'react';
import type { Note } from '@/features/piano-roll/types';

const MOUNT_BATCH_SIZE = 40;

type MountState = {
    enabled: boolean;
    ids: ReadonlySet<string>;
};

export function useVelocityMountQueue(
    notes: readonly Note[],
    enabled: boolean,
    priorityId: string | null,
    paused = false,
) {
    const [mounted, setMounted] = useState<MountState>(() => ({
        enabled,
        ids: new Set(),
    }));
    const visible = useMemo(
        () =>
            enabled && mounted.enabled
                ? notes.filter((note) => mounted.ids.has(note.id))
                : [],
        [enabled, mounted, notes],
    );
    if (mounted.enabled !== enabled) {
        setMounted({ enabled, ids: new Set() });
    } else if (visible.length !== mounted.ids.size) {
        setMounted({ enabled, ids: new Set(visible.map((note) => note.id)) });
    }

    useEffect(() => {
        if (!enabled || !mounted.enabled || paused) return;
        const admitted = new Set(visible.map((note) => note.id));
        const pending = notes.filter((note) => !admitted.has(note.id));
        const priorityIndex = pending.findIndex(
            (note) => note.id === priorityId,
        );
        if (priorityIndex > 0) {
            const [priority] = pending.splice(priorityIndex, 1);
            pending.unshift(priority);
        }
        for (const note of pending.slice(0, MOUNT_BATCH_SIZE)) {
            admitted.add(note.id);
        }
        if (
            admitted.size === mounted.ids.size &&
            [...admitted].every((id) => mounted.ids.has(id))
        )
            return;
        const frame = requestAnimationFrame(() => {
            setMounted({ enabled: true, ids: admitted });
        });
        return () => cancelAnimationFrame(frame);
    }, [enabled, mounted, notes, priorityId, visible, paused]);

    return {
        visible,
        busy: enabled && !paused && visible.length < notes.length,
    };
}
