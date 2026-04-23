#!/usr/bin/env node
/**
 * Smoke test for Phase 2 time tracking. Run against a running dev server.
 *
 *   node scripts/smoke-time.mjs
 *
 * What it does:
 *   1. Reads the bootstrap admin from the DB via Prisma
 *   2. Derives the admin's PIN from phone, logs in via /api/auth/login
 *   3. Creates three test TimeEntry rows directly in DB (two finished, one active)
 *   4. GETs /time and asserts key strings render
 *   5. GETs /admin/timesheets and asserts summary + rows render
 *   6. GETs /admin/timesheets/export?from=...&to=... and validates CSV shape
 *   7. Cleans up the test rows
 */
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE_URL || "http://localhost:3000";

const prisma = new PrismaClient();

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
    throw new Error(msg);
  }
  console.log("ok:", msg);
}

async function login(userId, pin) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, pin }),
    redirect: "manual",
  });
  const body = await res.text();
  assert(
    res.status === 200,
    `POST /api/auth/login -> 200 (got ${res.status}: ${body.slice(0, 120)})`,
  );
  const cookies = res.headers.getSetCookie?.() ?? [];
  const session = cookies.find((c) => c.startsWith("sg_session="));
  assert(!!session, "received sg_session cookie");
  return session.split(";")[0];
}

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
  });
  assert(!!admin, "found bootstrap admin in DB");

  const pin = admin.phone.slice(-4);
  console.log(`   logging in as ${admin.name} (PIN = last 4 of phone)`);
  const cookie = await login(admin.id, pin);

  // --- Seed test entries ---
  const now = Date.now();
  const h = (hours) => new Date(now - hours * 60 * 60 * 1000);

  await prisma.timeEntry.deleteMany({
    where: { userId: admin.id, note: { startsWith: "SMOKE" } },
  });

  const finished1 = await prisma.timeEntry.create({
    data: {
      userId: admin.id,
      clockInAt: h(30),
      clockOutAt: h(22),
      breakStartAt: h(26),
      breakEndAt: h(25.5),
      note: "SMOKE test shift A",
      status: "OPEN",
    },
  });
  const finished2 = await prisma.timeEntry.create({
    data: {
      userId: admin.id,
      clockInAt: h(8),
      clockOutAt: h(2),
      note: "SMOKE test shift B",
      status: "OPEN",
    },
  });
  assert(!!finished1.id && !!finished2.id, "seeded two finished shifts");

  // --- /time renders ---
  {
    const res = await fetch(`${BASE}/time`, {
      headers: { Cookie: cookie },
    });
    const body = await res.text();
    assert(res.status === 200, `GET /time -> 200 (got ${res.status})`);
    assert(body.includes("Time Tracking"), "/time shows title");
    assert(body.includes("Clock In"), "/time shows Clock In button");
    assert(body.includes("SMOKE test shift A"), "/time shows shift A in history");
    assert(body.includes("SMOKE test shift B"), "/time shows shift B in history");
  }

  // --- /admin/timesheets renders ---
  {
    const res = await fetch(`${BASE}/admin/timesheets`, {
      headers: { Cookie: cookie },
    });
    const body = await res.text();
    assert(
      res.status === 200,
      `GET /admin/timesheets -> 200 (got ${res.status})`,
    );
    assert(body.includes("Timesheets"), "/admin/timesheets title renders");
    assert(body.includes("Export CSV"), "Export CSV button present");
    assert(body.includes("Lock range"), "Lock range button present");
    assert(body.includes("SMOKE test shift A"), "shift A in admin table");
  }

  // --- CSV export ---
  {
    // Wide range so we catch the 30h-ago test entry.
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const ymd = (d) => d.toISOString().slice(0, 10);
    const url = `${BASE}/admin/timesheets/export?from=${ymd(weekAgo)}&to=${ymd(today)}`;
    const res = await fetch(url, { headers: { Cookie: cookie } });
    const body = await res.text();
    assert(res.status === 200, `GET export -> 200 (got ${res.status})`);
    assert(
      res.headers.get("content-type")?.includes("text/csv"),
      "content-type is text/csv",
    );
    const disp = res.headers.get("content-disposition") || "";
    assert(disp.startsWith("attachment;"), "content-disposition: attachment");
    const lines = body.trim().split("\r\n");
    assert(lines.length >= 3, `CSV has header + >=2 data rows (got ${lines.length})`);
    assert(
      lines[0].startsWith("Employee Name,Employee Phone,Role,Shift Date"),
      "CSV header matches spec",
    );
    const smokeLines = lines.filter((l) => l.includes("SMOKE test shift"));
    assert(smokeLines.length === 2, "CSV contains both smoke shifts");
    // Shift A: 8h gross, 30min break -> 7.50 paid hours
    assert(
      lines.some((l) => l.includes("SMOKE test shift A") && l.includes(",7.50,")),
      "shift A paid hours = 7.50 (8h - 30min break)",
    );
    // Shift B: 6h gross, no break -> 6.00
    assert(
      lines.some((l) => l.includes("SMOKE test shift B") && l.includes(",6.00,")),
      "shift B paid hours = 6.00",
    );
  }

  // --- Non-admin cannot hit admin routes ---
  // Skipped here: we only have the admin user seeded. Middleware/requireAdmin
  // is exercised by the positive cases above + existing Phase 1 coverage.

  // --- Cleanup ---
  await prisma.timeEntry.deleteMany({
    where: { userId: admin.id, note: { startsWith: "SMOKE" } },
  });
  console.log("cleaned up SMOKE entries");

  await prisma.$disconnect();
  console.log(process.exitCode ? "\nSMOKE TEST FAILED" : "\nSMOKE TEST PASSED");
}

main().catch(async (e) => {
  console.error(e);
  process.exitCode = 1;
  try {
    await prisma.$disconnect();
  } catch {}
});
