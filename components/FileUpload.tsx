"use client";

import { useState } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Loader2, Upload, FileText, X } from "lucide-react";

export interface FileUploadResult {
  url: string;
  path: string;
  name: string;
}

interface FileUploadProps {
  /** Optional path prefix (e.g. "sessions/sessionId" or "students/studentId") */
  pathPrefix?: string;
  /** Callback when upload completes */
  onUpload?: (result: FileUploadResult) => void;
  /** Current user ID (for storage path) */
  userId: string;
  /** Accepted file types, e.g. "image/*,.pdf" */
  accept?: string;
  /** Max size in bytes */
  maxSizeBytes?: number;
}

export default function FileUpload({
  pathPrefix = "misc",
  onUpload,
  userId,
  accept = "image/*,.pdf,.doc,.docx",
  maxSizeBytes = 10 * 1024 * 1024,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > maxSizeBytes) {
      setError(`File must be under ${Math.round(maxSizeBytes / 1024 / 1024)}MB`);
      return;
    }
    setUploading(true);
    setProgress(0);
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const path = `files/${userId}/${pathPrefix}/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, path);
    try {
      const task = uploadBytesResumable(storageRef, file);
      task.on("state_changed", (snap) => {
        setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
      });
      await task;
      const url = await getDownloadURL(storageRef);
      onUpload?.({ url, path, name: file.name });
    } catch (err: unknown) {
      setError((err as Error).message || "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium cursor-pointer transition-colors">
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          disabled={uploading}
          className="sr-only"
        />
        {uploading ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            Uploading… {progress}%
          </>
        ) : (
          <>
            <Upload size={18} /> Upload file
          </>
        )}
      </label>
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <X size={14} /> {error}
        </p>
      )}
    </div>
  );
}
