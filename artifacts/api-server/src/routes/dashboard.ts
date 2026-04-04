import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, ptsTable, dailyActivitiesTable, findingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { computeTrafficLight } from "../lib/traffic-light";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;
  const today = new Date().toISOString().split("T")[0];

  let pts = await db.select().from(ptsTable).orderBy(ptsTable.code);

  if (user.role === "apuppt") {
    if (!user.ptId) {
      res.json({ totalPts: 0, greenCount: 0, yellowCount: 0, redCount: 0, ptStatuses: [] });
      return;
    }
    pts = pts.filter((p) => p.id === user.ptId);
  }

  const ptStatuses = await Promise.all(
    pts.map(async (pt) => {
      const [lastActivity] = await db
        .select()
        .from(dailyActivitiesTable)
        .where(eq(dailyActivitiesTable.ptId, pt.id))
        .orderBy(desc(dailyActivitiesTable.date))
        .limit(1);

      const openFindings = await db
        .select()
        .from(findingsTable)
        .where(eq(findingsTable.ptId, pt.id));

      const openCount = openFindings.filter((f) => f.status !== "completed").length;
      const overdueCount = openFindings.filter((f) => {
        if (f.status === "completed") return false;
        const daysDiff = Math.floor(
          (new Date(today).getTime() - new Date(f.date).getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysDiff > 3;
      }).length;

      const status = computeTrafficLight(lastActivity?.date ?? null, openFindings, today);

      return {
        id: pt.id,
        code: pt.code,
        name: pt.name,
        status,
        lastActivityDate: lastActivity?.date ?? null,
        openFindingsCount: openCount,
        overdueCount,
      };
    })
  );

  const greenCount = ptStatuses.filter((p) => p.status === "green").length;
  const yellowCount = ptStatuses.filter((p) => p.status === "yellow").length;
  const redCount = ptStatuses.filter((p) => p.status === "red").length;

  res.json({
    totalPts: pts.length,
    greenCount,
    yellowCount,
    redCount,
    ptStatuses,
  });
});

export default router;
