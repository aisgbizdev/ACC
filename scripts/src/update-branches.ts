import { and, eq, inArray } from "drizzle-orm";
import { db, pool, ptsTable, branchesTable, dailyActivitiesTable, findingsTable } from "@workspace/db";

const TARGET_BRANCHES_BY_PT: Record<string, string[]> = {
  SGB: ["TCC Jakarta", "Semarang", "Makassar"],
  RFB: [
    "AXA Jakarta",
    "AXA 2 Jakarta",
    "AXA 3 Jakarta",
    "DBS Jakarta",
    "Bandung",
    "Semarang",
    "Solo",
    "Yogyakarta",
    "Ciputra Surabaya",
    "Pakuwon Surabaya",
    "Medan",
    "Pekanbaru",
    "Palembang",
    "Balikpapan",
  ],
  BPF: [
    "ET Jakarta",
    "PP Mall Jakarta",
    "Jambi",
    "Pontianak",
    "Malang",
    "Surabaya",
    "Medan",
    "Pekanbaru",
    "Banjar Masin",
    "Bandar Lampung",
    "Semarang",
  ],
  KPF: ["Jakarta", "Bali", "Bandung", "Yogyakarta", "Makassar", "Semarang"],
  EWF: ["SSC Jakarta", "Cyber 2 Jakarta", "Surabaya Trillium", "Surabaya Praxis", "Manado", "Semarang", "Cirebon"],
};

async function run() {
  const pts = await db.select({ id: ptsTable.id, code: ptsTable.code }).from(ptsTable);
  const ptMap = new Map(pts.map((pt) => [pt.code, pt.id]));

  for (const [ptCode, targetNames] of Object.entries(TARGET_BRANCHES_BY_PT)) {
    const ptId = ptMap.get(ptCode);
    if (!ptId) {
      console.log(`[SKIP] PT ${ptCode} tidak ditemukan.`);
      continue;
    }

    const targetSet = new Set(targetNames);
    const existing = await db
      .select({ id: branchesTable.id, name: branchesTable.name })
      .from(branchesTable)
      .where(eq(branchesTable.ptId, ptId));

    const existingNames = new Set(existing.map((b) => b.name));
    const toInsert = targetNames.filter((name) => !existingNames.has(name));

    for (const name of toInsert) {
      await db.insert(branchesTable).values({ ptId, name });
    }

    const removable = existing.filter((b) => !targetSet.has(b.name));
    const removableIds = removable.map((b) => b.id);
    let usedIds = new Set<string>();

    if (removableIds.length > 0) {
      const usedInActivities = await db
        .select({ id: dailyActivitiesTable.branchId })
        .from(dailyActivitiesTable)
        .where(and(eq(dailyActivitiesTable.ptId, ptId), inArray(dailyActivitiesTable.branchId, removableIds)));
      const usedInFindings = await db
        .select({ id: findingsTable.branchId })
        .from(findingsTable)
        .where(and(eq(findingsTable.ptId, ptId), inArray(findingsTable.branchId, removableIds)));

      usedIds = new Set(
        [...usedInActivities.map((r) => r.id), ...usedInFindings.map((r) => r.id)].filter((v): v is string => Boolean(v)),
      );

      const safeDeleteIds = removableIds.filter((id) => !usedIds.has(id));
      if (safeDeleteIds.length > 0) {
        await db.delete(branchesTable).where(and(eq(branchesTable.ptId, ptId), inArray(branchesTable.id, safeDeleteIds)));
      }
    }

    const skippedUsed = removable.filter((b) => usedIds.has(b.id)).map((b) => b.name);
    console.log(
      `[${ptCode}] insert ${toInsert.length}, hapus ${Math.max(removable.length - skippedUsed.length, 0)}, dipertahankan(terpakai) ${skippedUsed.length}`,
    );
    if (skippedUsed.length > 0) {
      console.log(`  dipakai aktivitas/temuan: ${skippedUsed.join(", ")}`);
    }
  }

  console.log("Update cabang selesai.");
}

run()
  .catch((err) => {
    console.error("Update cabang gagal:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
