import { parseProjectRecord, type ProjectRecord } from './projectRecord';

export async function saveProject(project: ProjectRecord): Promise<void> {
    const record = parseProjectRecord(project);
    const { projectsTable } = await import('./projectDatabase');
    await projectsTable.put(record);
}

export async function loadProject(): Promise<ProjectRecord | null> {
    const { projectsTable } = await import('./projectDatabase');
    const project: unknown = await projectsTable.get('local');
    return project === undefined ? null : parseProjectRecord(project);
}
