export interface UsageStore {
  reserve(kind: string, limit: number, count?: number): void | Promise<void>;
}
export interface VideoCache {
  getOrLoad<T>(key: unknown[], ttl: number, load: () => Promise<T>): Promise<T>;
  sweep(): void | Promise<void>;
}
