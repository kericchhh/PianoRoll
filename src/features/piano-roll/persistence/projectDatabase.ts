import { Dexie } from 'dexie';
import type { ProjectRecord } from './projectRecord';

export const projectDatabase = new Dexie('PianoRoll');
projectDatabase.version(1).stores({ projects: 'id' });

export const projectsTable = projectDatabase.table<ProjectRecord, string>(
    'projects',
);
