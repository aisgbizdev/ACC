import { db, pool, ptsTable, usersTable, branchesTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const BRANCHES_BY_PT: Record<string, string[]> = {
  SGB: [
    "TCC Jakarta",
    "Semarang",
    "Makassar",
  ],
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
  KPF: [
    "Jakarta",
    "Bali",
    "Bandung",
    "Yogyakarta",
    "Makassar",
    "Semarang",
  ],
  EWF: [
    "SSC Jakarta",
    "Cyber 2 Jakarta",
    "Surabaya Trillium",
    "Surabaya Praxis",
    "Manado",
    "Semarang",
    "Cirebon",
  ],
};

async function seed() {
  console.log("Seeding database...");

  const pts = [
    { code: "SGB", name: "Solid Gold Berjangka" },
    { code: "RFB", name: "Rifan Financindo Berjangka" },
    { code: "BPF", name: "Best Profit Futures" },
    { code: "KPF", name: "Kontak Perkasa Futures" },
    { code: "EWF", name: "Equity World Futures" },
  ];

  const passwordHash = await bcrypt.hash("password123", 10);

  for (const pt of pts) {
    const existing = await db.select().from(ptsTable).where(eq(ptsTable.code, pt.code));
    if (existing.length === 0) {
      await db.insert(ptsTable).values(pt);
      console.log(`  Created PT: ${pt.code}`);
    } else {
      console.log(`  PT ${pt.code} already exists, skipping.`);
    }
  }

  const allPts = await db.select().from(ptsTable).orderBy(ptsTable.code);
  const ptMap = Object.fromEntries(allPts.map((p) => [p.code, p.id]));

  // Seed branches for each PT
  for (const [ptCode, branchNames] of Object.entries(BRANCHES_BY_PT)) {
    const ptId = ptMap[ptCode];
    if (!ptId) continue;
    const existingBranches = await db.select().from(branchesTable).where(eq(branchesTable.ptId, ptId));
    if (existingBranches.length === 0) {
      for (const name of branchNames) {
        await db.insert(branchesTable).values({ name, ptId });
      }
      console.log(`  Created ${branchNames.length} branches for PT ${ptCode}`);
    } else {
      console.log(`  Branches for PT ${ptCode} already exist (${existingBranches.length}), skipping.`);
    }
  }

  // Rename old global dk/du users that conflict with new per-PT usernames
  const conflictingUsernames = ["dk", "du"];
  for (const oldUsername of conflictingUsernames) {
    const existing = await db.select().from(usersTable).where(eq(usersTable.username, oldUsername));
    if (existing.length > 0) {
      const renamedUsername = `${oldUsername}.legacy`;
      const renamedEmail = `${oldUsername}.legacy@acc.local`;
      await db.update(usersTable).set({ username: renamedUsername, email: renamedEmail }).where(eq(usersTable.username, oldUsername));
      console.log(`  Renamed old user: ${oldUsername} -> ${renamedUsername}`);
    }
  }

  const ptCodes = ["SGB", "RFB", "BPF", "KPF", "EWF"];
  const suffix = (code: string) => code.toLowerCase();

  const users: Array<{ name: string; username: string; email: string; role: "apuppt" | "dk" | "du" | "owner" | "superadmin"; ptCode: string | null }> = [];

  for (const code of ptCodes) {
    users.push({ name: `APUPPT ${code}`, username: `apuppt.${suffix(code)}`, email: `apuppt.${suffix(code)}@acc.local`, role: "apuppt", ptCode: code });
    users.push({ name: `Dewan Komisaris ${code}`, username: `dk.${suffix(code)}`, email: `dk.${suffix(code)}@acc.local`, role: "dk", ptCode: code });
    users.push({ name: `Direksi Utama ${code}`, username: `du.${suffix(code)}`, email: `du.${suffix(code)}@acc.local`, role: "du", ptCode: code });
  }

  users.push({ name: "Owner ACC", username: "owner", email: "owner@acc.local", role: "owner", ptCode: null });
  users.push({ name: "Superadmin ACC", username: "superadmin", email: "superadmin@acc.local", role: "superadmin", ptCode: null });

  for (const user of users) {
    const existing = await db.select().from(usersTable).where(eq(usersTable.username, user.username));
    if (existing.length === 0) {
      const ptId = user.ptCode ? (ptMap[user.ptCode] ?? null) : null;
      await db.insert(usersTable).values({
        name: user.name,
        username: user.username,
        email: user.email,
        passwordHash,
        role: user.role,
        ptId,
      });
      console.log(`  Created user: ${user.username} (${user.role})`);
    } else {
      console.log(`  User ${user.username} already exists, skipping.`);
    }
  }

  console.log("Seeding complete!");
  await pool.end();
}

seed().catch(async (err) => {
  console.error("Seed failed:", err);
  await pool.end().catch(() => {});
  process.exit(1);
});
