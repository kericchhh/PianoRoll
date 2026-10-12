import { projectsTable } from './projectDatabase';
import { parseProjectRecord, type ProjectRecord } from './projectRecord';

export async function saveProject(project: ProjectRecord): Promise<void> {
    await projectsTable.put(parseProjectRecord(project));
}

export async function loadProject(): Promise<ProjectRecord | null> {
    const project: unknown = await projectsTable.get('local');
    return project === undefined ? null : parseProjectRecord(project);
}
