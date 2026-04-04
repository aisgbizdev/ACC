import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, ptsTable, dailyActivitiesTable, findingsTable } from "@workspace/db";
import { requireRole } from "../middlewares/auth";
import { computeTrafficLight } from "../lib/traffic-light";

const router: IRouter = Router();

router.get("/reports/summary", requireRole("dk", "du", "owner"), async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const pts = await db.select().from(ptsTable).orderBy(ptsTable.code);

  const summaries = await Promise.all(
    pts.map(async (pt) => {
      const activities = await db
        .select()
        .from(dailyActivitiesTable)
        .where(eq(dailyActivitiesTable.ptId, pt.id));

      const findings = await db
        .select()
        .from(findingsTable)
        .where(eq(findingsTable.ptId, pt.id));

      const [lastActivity] = await db
        .select()
        .from(dailyActivitiesTable)
        .where(eq(dailyActivitiesTable.ptId, pt.id))
        .orderBy(dailyActivitiesTable.date)
        .limit(1);

      const openFindings = findings.filter((f) => f.status !== "completed");
      const completedFindings = findings.filter((f) => f.status === "completed");
      const status = computeTrafficLight(lastActivity?.date ?? null, findings, today);

      return {
        ptId: pt.id,
        ptCode: pt.code,
        ptName: pt.name,
        totalActivities: activities.length,
        totalFindings: findings.length,
        openFindings: openFindings.length,
        completedFindings: completedFindings.length,
        status,
        lastActivityDate: lastActivity?.date ?? null,
      };
    })
  );

  res.json(summaries);
});

export default router;
