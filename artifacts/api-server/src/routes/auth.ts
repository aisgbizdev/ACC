import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, usersTable } from "@workspace/db";
import { LoginBody, ChangePasswordBody, ResetPasswordBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";
import { logAudit } from "../lib/audit";
import { z } from "zod";

const router: IRouter = Router();

const uploadsDir = path.join(process.cwd(), "uploads", "avatars");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (req, _file, cb) => {
    const sessionUser = ((req.session as unknown) as Record<string, unknown>).user as { id: string } | undefined;
    const userId = sessionUser?.id ?? "unknown";
    cb(null, `${userId}.jpg`);
  },
});

const upload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Hanya file gambar yang diizinkan."));
    }
  },
});

const UpdateProfileBody = z.object({
  name: z.string().min(2).max(255),
});

function userResponse(user: { id: string; name: string; username: string; email: string; role: string; ptId: string | null; avatarUrl?: string | null }) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    ptId: user.ptId ?? null,
    avatarUrl: user.avatarUrl ?? null,
  };
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password, rememberMe } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));

  if (!user) {
    res.status(401).json({ error: "Username atau password salah." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Username atau password salah." });
    return;
  }

  if (rememberMe) {
    req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
  }

  req.session.user = {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    ptId: user.ptId ?? null,
  };

  await logAudit("login", "user", user.id, req, { ptId: user.ptId });

  res.json(userResponse({ ...user, ptId: user.ptId ?? null }));
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  await logAudit("logout", "user", req.session.user?.id ?? null, req);
  req.session.destroy(() => {
    res.json({ success: true, message: "Logout berhasil." });
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const sessionUser = req.session.user!;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, sessionUser.id));
  if (!user) {
    res.status(401).json({ error: "Sesi tidak valid." });
    return;
  }
  res.json(userResponse({ ...user, ptId: user.ptId ?? null }));
});

router.put("/auth/profile", requireAuth, async (req, res): Promise<void> => {
  const sessionUser = req.session.user!;

  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Nama minimal 2 karakter." });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ name: parsed.data.name })
    .where(eq(usersTable.id, sessionUser.id))
    .returning();

  req.session.user = { ...req.session.user!, name: parsed.data.name };

  await logAudit("update_profile", "user", sessionUser.id, req, {
    afterData: { name: parsed.data.name },
  });

  res.json(userResponse({ ...updated, ptId: updated.ptId ?? null }));
});

router.post("/auth/profile/avatar", requireAuth, upload.single("avatar"), async (req, res): Promise<void> => {
  const sessionUser = req.session.user!;

  if (!req.file) {
    res.status(400).json({ error: "Tidak ada file yang diunggah." });
    return;
  }

  const avatarUrl = `/uploads/avatars/${sessionUser.id}.jpg`;

  const [updated] = await db
    .update(usersTable)
    .set({ avatarUrl })
    .where(eq(usersTable.id, sessionUser.id))
    .returning();

  await logAudit("update_avatar", "user", sessionUser.id, req, {});

  res.json(userResponse({ ...updated, ptId: updated.ptId ?? null }));
});

router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { currentPassword, newPassword } = parsed.data;
  const sessionUser = req.session.user!;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, sessionUser.id));
  if (!user) {
    res.status(401).json({ error: "Pengguna tidak ditemukan." });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Password saat ini tidak benar." });
    return;
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));

  res.json({ success: true, message: "Password berhasil diubah." });
});

router.post("/auth/reset-password", requireRole("superadmin"), async (req, res): Promise<void> => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId, newPassword } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "Pengguna tidak ditemukan." });
    return;
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));

  res.json({ success: true, message: "Password berhasil direset." });
});

router.get("/users", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;
  if (user.role !== "dk" && user.role !== "superadmin" && user.role !== "apuppt") {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  const users = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      role: usersTable.role,
      ptId: usersTable.ptId,
    })
    .from(usersTable)
    .orderBy(usersTable.name);

  res.json(users);
});

export default router;
