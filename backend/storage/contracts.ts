export interface UsageStore {
  reserve(kind: string, limit: number, count?: number): void | Promise<void>;
}
export interface VideoCache {
  entries?(): Promise<{ key: string; expiresAt: number; value: unknown }[]>;
  get?<T>(key: unknown[]): Promise<T | undefined>;
  update?<T>(
    key: unknown[],
    ttl: number,
    change: (value: T | undefined) => T,
  ): Promise<T>;
  getOrLoad<T>(key: unknown[], ttl: number, load: () => Promise<T>): Promise<T>;
  sweep(): void | Promise<void>;
}
