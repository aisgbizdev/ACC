---
name: Uploads use App Storage
description: File uploads must go to GCS App Storage, never local disk
---
Rule: all user file uploads (activity documents, avatars) are stored in Replit App Storage (GCS) under PRIVATE_OBJECT_DIR via artifacts/api-server/src/lib/docStorage.ts helpers — never on local disk.
**Why:** Production filesystem is ephemeral; every publish wiped all files stored under uploads/, which caused permanent loss of user documents (July 2026 incident). Local disk remains only as a read fallback for legacy dev files.
**How to apply:** Any new upload feature must use saveObject/getObjectReadStream/deleteObject from docStorage.ts (multer memoryStorage, not diskStorage). Serving routes need auth and headersSent-safe stream error handling.
