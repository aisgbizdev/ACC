export type ActivityDocument = {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
};

type MaybeWithDocuments = {
  documents?: unknown;
};

export function getActivityDocuments(activity: MaybeWithDocuments): ActivityDocument[] {
  if (!Array.isArray(activity.documents)) return [];
  return activity.documents.filter((doc): doc is ActivityDocument => {
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
