import { appConfig } from '../config';
import { JsonDataStore } from './jsonStore';
import type { Task, TaskCreateInput, TaskUpdateInput } from '../types';

export interface DataStore {
  listTasks(): Promise<Task[]>;
  createTask(data: TaskCreateInput): Promise<Task>;
  updateTask(id: string, data: TaskUpdateInput): Promise<Task>;
  deleteTask(id: string): Promise<Task>;
  reorderTasks(order: string[]): Promise<Task[]>;
  listTags(): Promise<string[]>;
  createTag(name: string): Promise<{ created: boolean; tags: string[] }>;
  renameTag(currentTag: string, nextTag: string): Promise<{ name: string; tags: string[] }>;
  deleteTag(tag: string): Promise<string[]>;
}

let cachedStore: DataStore | undefined;

export function getDataStore(): DataStore {
  if (!cachedStore) {
    cachedStore = createStore();
  }
  return cachedStore;
}

function createStore(): DataStore {
  const provider = appConfig.dataStore;

  if (provider === 'prisma') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const { PrismaDataStore } = require('./prismaStore');
      if (appConfig.databaseUrl) {
        process.env.DATABASE_URL = appConfig.databaseUrl;
      }
      return new PrismaDataStore(appConfig.prisma);
    } catch (error) {
      console.warn('Failed to initialize Prisma data store, falling back to JSON:', error);
    }
  }

  const options = appConfig.jsonDataRoot ? { rootDir: appConfig.jsonDataRoot } : undefined;
  return new JsonDataStore(options);
}
