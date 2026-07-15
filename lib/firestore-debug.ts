/** Dev-only Firestore read counter (client-side getDoc/getDocs). */

let readCount = 0;
const listeners = new Set<(count: number) => void>();

export function trackFirestoreReads(n: number): void {
  if (process.env.NODE_ENV !== "development") return;
  readCount += n;
  listeners.forEach((fn) => fn(readCount));
}

export function getFirestoreReadCount(): number {
  return readCount;
}

export function resetFirestoreReadCount(): void {
  readCount = 0;
  listeners.forEach((fn) => fn(0));
}

export function subscribeFirestoreReadCount(fn: (count: number) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function wrapFirestoreResult<T>(result: T, docCount: number): T {
  trackFirestoreReads(docCount);
  return result;
}
