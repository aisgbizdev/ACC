import { Request, Response, NextFunction } from "express";

export type UserRole = "apuppt" | "dk" | "du" | "owner" | "superadmin";

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  ptId: string | null;
}

declare module "express-session" {
  interface SessionData {
    user?: SessionUser;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.user) {
    res.status(401).json({ error: "Tidak terautentikasi. Silakan login." });
    return;
  }
  if ((req.session.user as SessionUser & { isActive?: boolean }).isActive === false) {
    req.session.destroy(() => {});
    res.status(403).json({ error: "Akun Anda telah dinonaktifkan. Hubungi superadmin." });
    return;
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session?.user) {
      res.status(401).json({ error: "Tidak terautentikasi." });
      return;
    }
    if (req.session.user.role === "superadmin") {
      next();
      return;
    }
    if (!roles.includes(req.session.user.role)) {
      res.status(403).json({ error: "Akses ditolak. Role tidak memiliki izin." });
      return;
    }
    next();
  };
}
