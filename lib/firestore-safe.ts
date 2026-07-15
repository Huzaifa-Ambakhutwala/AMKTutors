export type FirestoreErrorKind = "quota" | "permission" | "network" | "timeout" | "unknown";

export class FirestoreSafeError extends Error {
  kind: FirestoreErrorKind;

  constructor(kind: FirestoreErrorKind, message: string) {
    super(message);
    this.name = "FirestoreSafeError";
    this.kind = kind;
  }
}

export function mapFirestoreError(error: unknown): FirestoreSafeError {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: string }).code)
      : "";
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";

  if (code === "resource-exhausted" || /quota|RESOURCE_EXHAUSTED/i.test(message)) {
    return new FirestoreSafeError(
      "quota",
      "Database quota exceeded. Please try again later or contact support."
    );
  }
  if (code === "permission-denied" || /permission/i.test(message)) {
    return new FirestoreSafeError("permission", "You do not have permission to load this data.");
  }
  if (
    code === "unavailable" ||
    code === "deadline-exceeded" ||
    /network|fetch|offline/i.test(message)
  ) {
    return new FirestoreSafeError("network", "Network error. Check your connection and try again.");
  }
  return new FirestoreSafeError("unknown", message);
}

export function withFirestoreTimeout<T>(
  promise: Promise<T>,
  ms = 8000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new FirestoreSafeError(
          "timeout",
          "Request timed out. The database may be busy — please try again."
        )
      );
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err instanceof FirestoreSafeError ? err : mapFirestoreError(err));
      });
  });
}

export async function safeFirestore<T>(fn: () => Promise<T>, timeoutMs = 8000): Promise<T> {
  return withFirestoreTimeout(fn(), timeoutMs);
}

export function firestoreErrorMessage(error: unknown): string {
  if (error instanceof FirestoreSafeError) return error.message;
  return mapFirestoreError(error).message;
}

export function isQuotaError(error: unknown): boolean {
  return error instanceof FirestoreSafeError
    ? error.kind === "quota"
    : mapFirestoreError(error).kind === "quota";
}
