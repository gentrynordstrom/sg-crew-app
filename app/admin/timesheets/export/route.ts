import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildTimesheetCsv,
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

  const rows = await prisma.timeEntry.findMany({
    where: {
      clockInAt: {
        gte: startOfPayrollDay(from),
        lte: endOfPayrollDay(to),
      },
      // Only export finished shifts — unfinished shifts have no paid hours
      clockOutAt: { not: null },
    },
    orderBy: [{ user: { name: "asc" } }, { clockInAt: "asc" }],
    include: {
      user: { select: { name: true, phone: true, role: true } },
    },
  });

  const csv = buildTimesheetCsv(rows);
  const filename = `timesheets_${from}_to_${to}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
