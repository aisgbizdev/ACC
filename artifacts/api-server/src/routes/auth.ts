import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { LoginBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user) {
    res.status(401).json({ error: "Email atau password salah." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Email atau password salah." });
    return;
  }

  req.session.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    ptId: user.ptId ?? null,
  };

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    ptId: user.ptId ?? null,
  });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ success: true, message: "Logout berhasil." });
  });
});

router.get("/auth/me", requireAuth, (req, res): void => {
  const user = req.session.user!;
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    ptId: user.ptId ?? null,
  });
});

export default router;
