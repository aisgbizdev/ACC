import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { LoginBody, ChangePasswordBody, ResetPasswordBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

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

  res.json({
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    ptId: user.ptId ?? null,
  });
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  await logAudit("logout", "user", req.session.user?.id ?? null, req);
  req.session.destroy(() => {
    res.json({ success: true, message: "Logout berhasil." });
  });
});

router.get("/auth/me", requireAuth, (req, res): void => {
  const user = req.session.user!;
  res.json({
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    ptId: user.ptId ?? null,
  });
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

// List users for assignment (accessible by DK, superadmin, and apuppt with DK assignment use)
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
