import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import {
    createProjectRecord,
    parseProjectRecord,
    type ProjectRecord,
} from '@/features/piano-roll/persistence/projectRecord';
import {
    loadProject,
    saveProject,
} from '@/features/piano-roll/persistence/projectRepository';

type Options = {
    barCount: number;
    bpm: number;
    canLoad?: () => boolean;
    onBeforeLoad?: (project: ProjectRecord) => void;
    onLoaded?: (project: ProjectRecord) => void;
    announce?: (message: string) => void;
};

export function useProjectPersistence(options: Options) {
    const [operation, setOperation] = useState<'save' | 'load' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState('');
    const pendingRef = useRef(false);
    const lifetimeRef = useRef({ generation: 0, mounted: false });
    const optionsRef = useRef(options);
    useEffect(() => {
        optionsRef.current = options;
    });
    useEffect(() => {
        const lifetime = lifetimeRef.current;
        lifetime.mounted = true;
        lifetime.generation++;
        return () => {
            lifetime.mounted = false;
            lifetime.generation++;
        };
    }, []);

    async function run(action: 'save' | 'load'): Promise<void> {
        if (pendingRef.current || !lifetimeRef.current.mounted) return;
        pendingRef.current = true;
        const generation = lifetimeRef.current.generation;
        const current = () => lifetimeRef.current.generation === generation;
        setOperation(action);
        setError(null);
        setStatus('');
        try {
            const { notes } = useNoteStore.getState();
            const barCount = optionsRef.current.barCount;
            const bpm = optionsRef.current.bpm;
            let message: string;
            if (action === 'save') {
                await saveProject(createProjectRecord(notes, barCount, bpm));
                message = 'Project saved in this browser.';
            } else {
                if (optionsRef.current.canLoad?.() === false)
                    throw new Error(
                        'Finish the active edit before loading a project.',
                    );
                const saved = await loadProject();
                if (!current()) return;
                if (!saved)
                    throw new Error(
                        'No saved project yet. Save a project first.',
                    );
                const project = parseProjectRecord(saved);
                if (
                    useNoteStore.getState().notes !== notes ||
                    optionsRef.current.barCount !== barCount ||
                    optionsRef.current.bpm !== bpm ||
                    optionsRef.current.canLoad?.() === false
                ) {
                    throw new Error(
                        'The composition changed while loading. Try loading again.',
                    );
                }
                optionsRef.current.onBeforeLoad?.(project);
                useNoteStore.getState().replaceNotes(
                    project.notes.map((note) => ({
                        ...note,
                        selected: false,
                    })),
                );
                optionsRef.current.onLoaded?.(project);
                message = `Loaded ${project.notes.length} ${project.notes.length === 1 ? 'note' : 'notes'}. Selection and undo history cleared.`;
            }
            if (!current()) return;
            setStatus(message);
            optionsRef.current.announce?.(message);
            toast.success(
                action === 'save' ? 'Project saved' : 'Project loaded',
                {
                    id: 'project-persistence',
                    description: message,
                },
            );
        } catch (cause) {
            if (!current()) return;
            const message =
                cause instanceof Error
                    ? cause.message
                    : 'Browser storage is unavailable. Please try again.';
            setError(message);
            toast.error(
                action === 'save'
                    ? 'Could not save project'
                    : 'Could not load project',
                {
                    id: 'project-persistence',
                    description: message,
                },
            );
        } finally {
            pendingRef.current = false;
            if (current()) setOperation(null);
        }
    }

    return {
        save: () => run('save'),
        load: () => run('load'),
        isBusy: operation !== null,
        operation,
        error,
        status,
    };
}

export type ProjectPersistenceControls = ReturnType<
    typeof useProjectPersistence
>;
