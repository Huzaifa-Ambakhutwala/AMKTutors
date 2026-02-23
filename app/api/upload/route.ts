import { NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];
    await adminAuth.verifyIdToken(token);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const pathPrefix = (formData.get("pathPrefix") as string) || "misc";
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const path = `files/${pathPrefix}/${Date.now()}_${safeName}`;

    const storage = getStorage();
    const bucket = storage.bucket();
    const bucketFile = bucket.file(path);
    await bucketFile.save(buffer, {
      metadata: { contentType: file.type || "application/octet-stream" },
    });
    const [url] = await bucketFile.getSignedUrl({
      action: "read",
      expires: "03-01-2500",
    });
    return NextResponse.json({ url, path, name: file.name });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
