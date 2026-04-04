import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, ptsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { logAudit } from "../lib/audit";
import { z } from "zod";

const router: IRouter = Router();

const CreateUserBody = z.object({
  name: z.string().min(2).max(255),
  username: z.string().min(3).max(255),
  email: z.string().email(),
  role: z.enum(["apuppt", "dk", "du", "owner", "superadmin"]),
  ptId: z.string().uuid().optional().nullable(),
  password: z.string().min(6),
});

const UpdateUserBody = z.object({
  name: z.string().min(2).max(255).optional(),
  role: z.enum(["apuppt", "dk", "du", "owner", "superadmin"]).optional(),
  ptId: z.string().uuid().optional().nullable(),
  email: z.string().email().optional(),
});

router.get("/users", requireRole("dk", "superadmin"), async (req, res): Promise<void> => {
  const sessionUser = req.session.user!;

  const users = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      username: usersTable.username,
      email: usersTable.email,
      role: usersTable.role,
      ptId: usersTable.ptId,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
      ptName: ptsTable.name,
      ptCode: ptsTable.code,
    })
    .from(usersTable)
    .leftJoin(ptsTable, eq(usersTable.ptId, ptsTable.id))
    .orderBy(usersTable.name);

  res.json(users);
});

router.post("/users", requireRole("superadmin"), async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors.map((e) => e.message).join(", ") });
    return;
  }

  const { name, username, email, role, ptId, password } = parsed.data;

  const [existingUsername] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, username));
  if (existingUsername) {
    res.status(409).json({ error: "Username sudah digunakan." });
    return;
  }

  const [existingEmail] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  if (existingEmail) {
    res.status(409).json({ error: "Email sudah digunakan." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [newUser] = await db
    .insert(usersTable)
    .values({
      name,
      username,
      email,
      role,
      ptId: ptId ?? null,
      passwordHash,
      isActive: true,
    })
    .returning({
      id: usersTable.id,
      name: usersTable.name,
      username: usersTable.username,
      email: usersTable.email,
      role: usersTable.role,
      ptId: usersTable.ptId,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
    });

  await logAudit("create_user", "user", req.session.user!.id, req, { afterData: { id: newUser.id, username, role } });

  res.status(201).json(newUser);
});

router.put("/users/:id", requireRole("superadmin"), async (req, res): Promise<void> => {
  const id = req.params.id as string;
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors.map((e) => e.message).join(", ") });
    return;
  }

  const { name, role, ptId, email } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Pengguna tidak ditemukan." });
    return;
  }

  if (email && email !== existing.email) {
    const [emailConflict] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
    if (emailConflict) {
      res.status(409).json({ error: "Email sudah digunakan oleh pengguna lain." });
      return;
    }
  }

  const updateData: Partial<typeof usersTable.$inferInsert> = {};
  if (name !== undefined) updateData.name = name;
  if (role !== undefined) updateData.role = role;
  if (ptId !== undefined) updateData.ptId = ptId ?? null;
  if (email !== undefined) updateData.email = email;

  const [updated] = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, id))
    .returning({
      id: usersTable.id,
      name: usersTable.name,
      username: usersTable.username,
      email: usersTable.email,
      role: usersTable.role,
      ptId: usersTable.ptId,
      isActive: usersTable.isActive,
    });

  await logAudit("update_user", "user", req.session.user!.id, req, { beforeData: existing, afterData: updated });

  res.json(updated);
});

router.patch("/users/:id/deactivate", requireRole("superadmin"), async (req, res): Promise<void> => {
  const id = req.params.id as string;

  if (id === req.session.user!.id) {
    res.status(400).json({ error: "Tidak bisa menonaktifkan akun sendiri." });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Pengguna tidak ditemukan." });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ isActive: false })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, isActive: usersTable.isActive });

  await logAudit("deactivate_user", "user", req.session.user!.id, req, { afterData: { userId: id } });

  res.json(updated);
});

router.patch("/users/:id/activate", requireRole("superadmin"), async (req, res): Promise<void> => {
  const id = req.params.id as string;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Pengguna tidak ditemukan." });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ isActive: true })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, isActive: usersTable.isActive });

  await logAudit("activate_user", "user", req.session.user!.id, req, { afterData: { userId: id } });

  res.json(updated);
});

export default router;
