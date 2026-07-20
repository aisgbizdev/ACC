import { Storage, type File } from "@google-cloud/storage";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

function getPrivateObjectDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!dir) {
    throw new Error("PRIVATE_OBJECT_DIR belum diset. Buat bucket di Object Storage terlebih dahulu.");
  }
  return dir.endsWith("/") ? dir.slice(0, -1) : dir;
}

function parseObjectPath(fullPath: string): { bucketName: string; objectName: string } {
  const normalized = fullPath.startsWith("/") ? fullPath : `/${fullPath}`;
  const parts = normalized.split("/");
  if (parts.length < 3) {
    throw new Error("Path object storage tidak valid.");
  }
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

function fileFor(relativePath: string): File {
  const fullPath = `${getPrivateObjectDir()}/${relativePath}`;
  const { bucketName, objectName } = parseObjectPath(fullPath);
  return objectStorageClient.bucket(bucketName).file(objectName);
}

export async function saveObject(relativePath: string, buffer: Buffer, contentType: string): Promise<void> {
  await fileFor(relativePath).save(buffer, {
    contentType,
    resumable: false,
  });
}

export async function objectExists(relativePath: string): Promise<boolean> {
  const [exists] = await fileFor(relativePath).exists();
  return exists;
}

export function getObjectReadStream(relativePath: string) {
  return fileFor(relativePath).createReadStream();
}

export async function deleteObject(relativePath: string): Promise<void> {
  try {
    await fileFor(relativePath).delete();
  } catch {
    // object may not exist; ignore
  }
}
