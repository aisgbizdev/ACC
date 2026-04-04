import { db, ptsTable, usersTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  const pts = [
    { code: "SGB", name: "PT Sinar Graha Bersama" },
    { code: "RFB", name: "PT Ratu Fortuna Buana" },
    { code: "BPF", name: "PT Bina Prima Finansial" },
    { code: "KPF", name: "PT Karya Prima Finansial" },
    { code: "EWF", name: "PT Empower Wealth Finansial" },
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

  const users = [
    { name: "APUPPT SGB", email: "apuppt.sgb@acc.local", role: "apuppt" as const, ptCode: "SGB" },
    { name: "APUPPT RFB", email: "apuppt.rfb@acc.local", role: "apuppt" as const, ptCode: "RFB" },
    { name: "APUPPT BPF", email: "apuppt.bpf@acc.local", role: "apuppt" as const, ptCode: "BPF" },
    { name: "APUPPT KPF", email: "apuppt.kpf@acc.local", role: "apuppt" as const, ptCode: "KPF" },
    { name: "APUPPT EWF", email: "apuppt.ewf@acc.local", role: "apuppt" as const, ptCode: "EWF" },
    { name: "Dewan Komisaris", email: "dk@acc.local", role: "dk" as const, ptCode: null },
    { name: "Direksi Utama", email: "du@acc.local", role: "du" as const, ptCode: null },
    { name: "Owner ACC", email: "owner@acc.local", role: "owner" as const, ptCode: null },
  ];

  for (const user of users) {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, user.email));
    if (existing.length === 0) {
      const ptId = user.ptCode ? allPts.find((p) => p.code === user.ptCode)?.id ?? null : null;
      await db.insert(usersTable).values({
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
        ptId,
      });
      console.log(`  Created user: ${user.email} (${user.role})`);
    } else {
      console.log(`  User ${user.email} already exists, skipping.`);
    }
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
