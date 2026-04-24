import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildPaychexCsv,
  defaultDateRange,
  endOfPayrollDay,
  startOfPayrollDay,
} from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isYmd(s: string | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(request: NextRequest) {
  await requireAdmin();

  const url = new URL(request.url);
  const defaults = defaultDateRange();
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const from = isYmd(fromParam) ? fromParam : defaults.from;
  const to = isYmd(toParam) ? toParam : defaults.to;

  const rangeStart = startOfPayrollDay(from);
  const rangeEnd = endOfPayrollDay(to);

  const rows = await prisma.timeEntry.findMany({
    where: {
      clockInAt: { gte: rangeStart, lte: rangeEnd },
      clockOutAt: { not: null },
    },
    orderBy: [{ user: { name: "asc" } }, { clockInAt: "asc" }],
    include: {
      user: { select: { name: true, phone: true, role: true, paychexId: true } },
    },
  });

  // Fetch any roleForShift overrides for the same date range and users
  const userIds = [...new Set(rows.map((r) => r.userId))];
  const shiftOverrides = userIds.length > 0
    ? await prisma.scheduledShift.findMany({
        where: {
          userId: { in: userIds },
          roleForShift: { not: null },
          event: { date: { gte: rangeStart, lte: rangeEnd } },
        },
        select: {
          userId: true,
          roleForShift: true,
          event: { select: { date: true } },
        },
      })
    : [];

  // Build lookup: "userId:YYYY-MM-DD" -> roleForShift
  const roleOverrideMap = new Map<string, (typeof shiftOverrides)[number]["roleForShift"]>();
  for (const s of shiftOverrides) {
    if (!s.roleForShift) continue;
    const ymd = s.event.date.toISOString().slice(0, 10);
    roleOverrideMap.set(`${s.userId}:${ymd}`, s.roleForShift);
  }

  const enrichedRows = rows.map((r) => {
    const ymd = r.clockInAt.toISOString().slice(0, 10);
    return {
      ...r,
      effectiveRole: roleOverrideMap.get(`${r.userId}:${ymd}`) ?? null,
    };
  });

  const csv = buildPaychexCsv(enrichedRows);
  const filename = `paychex_${from}_to_${to}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
