export type ActivityDocument = {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
};

export function getActivityDocuments(activity: unknown): ActivityDocument[] {
  const docs = (activity as { documents?: unknown })?.documents;
  if (!Array.isArray(docs)) return [];
  return docs.filter((doc): doc is ActivityDocument => {
    return Boolean(
      doc &&
      typeof doc === "object" &&
      "id" in doc &&
      "originalName" in doc &&
      "fileName" in doc,
    );
  });
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
