import type { StorageProvider } from './types';

export class LocalStorageProvider<T> implements StorageProvider<T> {
  constructor(private readonly key: string) {}

  load(): T | null {
    if (typeof window === 'undefined') return null;

    try {
      const raw = localStorage.getItem(this.key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  save(data: T): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.key, JSON.stringify(data));
  }

  clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.key);
  }
}

export const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
