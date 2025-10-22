import { JsonDataStore } from './jsonStore';

export interface DataStore {
  readTasks(): Promise<import('../types').Task[]>;
  writeTasks(tasks: import('../types').Task[]): Promise<void>;
  readTags(): Promise<string[]>;
  writeTags(tags: unknown[]): Promise<string[]>;
}

let cachedStore: DataStore | undefined;

export function getDataStore(): DataStore {
  if (!cachedStore) {
    cachedStore = createStore();
  }
  return cachedStore;
}

function createStore(): DataStore {
  const provider = process.env.DATA_STORE?.toLowerCase();

  if (provider === 'prisma') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const { PrismaDataStore } = require('./prismaStore');
      return new PrismaDataStore();
    } catch (error) {
      console.warn('Failed to initialize Prisma data store, falling back to JSON:', error);
    }
  }

  return new JsonDataStore();
}
