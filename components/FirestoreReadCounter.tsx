"use client";

import { useEffect, useState } from "react";
import {
  getFirestoreReadCount,
  resetFirestoreReadCount,
  subscribeFirestoreReadCount,
} from "@/lib/firestore-debug";

export default function FirestoreReadCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    setCount(getFirestoreReadCount());
    return subscribeFirestoreReadCount(setCount);
  }, []);

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] rounded-lg border border-gray-200 bg-white/95 px-3 py-2 text-xs shadow-md backdrop-blur">
      <span className="font-semibold text-gray-700">Firestore reads (session):</span>{" "}
      <span className="font-mono text-primary">{count}</span>
      <button
        type="button"
        onClick={() => resetFirestoreReadCount()}
        className="ml-2 text-gray-500 hover:text-gray-800 underline"
      >
        reset
      </button>
    </div>
  );
}
