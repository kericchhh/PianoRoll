import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { ProjectRecord } from '@/features/piano-roll/persistence/projectRecord';
import { DEFAULT_FX_SETTINGS } from '@/features/piano-roll/audio/fxSettings';

let stored: unknown;
let moduleGate: Promise<void> | undefined;
const initialized = vi.fn();
const put = vi.fn(async (project: ProjectRecord) => {
    stored = project;
    return 'local';
});
const get = vi.fn(async () => stored);

function project(): ProjectRecord {
    return {
        id: 'local',
        version: 3,
        bpm: 93,
        ppq: 480,
        beatsPerBar: 4,
        barCount: 16,
        savedAt: 1000,
        fx: structuredClone(DEFAULT_FX_SETTINGS),
        notes: [
            {
                id: 'exact-note',
                pitch: 127,
                startTick: 70001,
                durationTicks: 1,
                velocity: 0,
            },
        ],
    };
}

beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    stored = undefined;
    moduleGate = undefined;
    vi.doMock('@/features/piano-roll/persistence/projectDatabase', async () => {
        initialized();
        await moduleGate;
        return { projectsTable: { put, get } };
    });
});
afterEach(() => {
    vi.doUnmock('@/features/piano-roll/persistence/projectDatabase');
});

test('importing the repository does not initialize browser storage', async () => {
    await import('@/features/piano-roll/persistence/projectRepository');
    expect(initialized).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
});

test('first operations initialize storage and preserve exact composition data through a round trip', async () => {
    const { saveProject, loadProject } =
        await import('@/features/piano-roll/persistence/projectRepository');
    expect(await loadProject()).toBeNull();
    await saveProject(project());
    expect(await loadProject()).toEqual(project());
    expect(initialized).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledWith('local');
});

test('invalid saves reject before loading or writing browser storage', async () => {
    const { saveProject } =
        await import('@/features/piano-roll/persistence/projectRepository');
    const invalid = { ...project(), version: 99 } as unknown as ProjectRecord;
    await expect(saveProject(invalid)).rejects.toThrow(/invalid|unsupported/i);
    expect(initialized).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
});

test('save snapshots composition data before waiting for the first database module load', async () => {
    let release!: () => void;
    moduleGate = new Promise<void>((resolve) => {
        release = resolve;
    });
    let imported = false;
    const importing =
        import('@/features/piano-roll/persistence/projectRepository').then(
            (repository) => {
                imported = true;
                return repository;
            },
        );
    try {
        await vi.waitFor(() => expect(imported).toBe(true));
        const { saveProject, loadProject } = await importing;
        const input = project();
        const saving = saveProject(input);
        await vi.waitFor(() => expect(initialized).toHaveBeenCalledOnce());
        input.bpm = 170;
        input.barCount = 4;
        input.notes[0].velocity = 127;
        input.fx.reverb.mix = 44;
        input.notes.push({ ...input.notes[0], id: 'later-edit' });
        expect(put).not.toHaveBeenCalled();
        release();
        await saving;
        expect(await loadProject()).toEqual(project());
    } finally {
        release();
        await importing;
    }
});

test('invalid stored records still reject through repository validation', async () => {
    stored = { ...project(), version: 99 };
    const { loadProject } =
        await import('@/features/piano-roll/persistence/projectRepository');
    await expect(loadProject()).rejects.toThrow(/invalid|unsupported/i);
});

test.each(['read', 'write'] as const)(
    'storage %s errors propagate to the caller',
    async (operation) => {
        const failure = new Error('Browser storage unavailable');
        if (operation === 'read') get.mockRejectedValueOnce(failure);
        else put.mockRejectedValueOnce(failure);
        const { saveProject, loadProject } =
            await import('@/features/piano-roll/persistence/projectRepository');
        const result =
            operation === 'read' ? loadProject() : saveProject(project());
        await expect(result).rejects.toBe(failure);
    },
);
