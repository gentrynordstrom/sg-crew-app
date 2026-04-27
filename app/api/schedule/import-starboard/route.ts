import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchPublicEvents, getEventTypeMap, clearEventTypeCache } from '@/lib/starboard'
import { requireAdmin } from '@/lib/auth'

const SOURCE_TYPE = 'starboard'

interface ImportResult {
  created: number
  updated: number
  cancelled: number
  errors: string[]
}

export async function POST(request: Request) {
  const cronSecret = request.headers.get('authorization')
  const isCron = cronSecret === `Bearer ${process.env.CRON_SECRET}`

  if (!isCron) {
    try {
      await requireAdmin()
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const result = await runImport()
    return NextResponse.json(result)
  } catch (err) {
    console.error('Starboard import failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    clearEventTypeCache()
  }
}

async function runImport(): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, cancelled: 0, errors: [] }

  const daysAhead = parseInt(process.env.STARBOARD_SYNC_DAYS_AHEAD ?? '60', 10)
  const today = new Date()
  const fromDate = today.toISOString().slice(0, 10)
  const throughDate = new Date(today.getTime() + daysAhead * 86400000)
    .toISOString().slice(0, 10)

  const systemUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    orderBy: { createdAt: 'asc' },
  })
  if (!systemUser) {
    throw new Error('No ADMIN user found to own synced events')
  }

  const [events, typeMap] = await Promise.all([
    fetchPublicEvents(fromDate, throughDate),
    getEventTypeMap(),
  ])

  const seenSourceIds = new Set<string>()

  for (const evt of events) {
    seenSourceIds.add(evt.id)
    const type = typeMap.get(evt.event_type_id)

    const startTime = new Date(evt.event_start_datetime)
    const endTime = new Date(evt.event_end_datetime)
    const dateOnly = new Date(startTime.toISOString().slice(0, 10))

    const title = type?.name ?? 'Cruise'

    const sourceMetadata = {
      event_type_id: evt.event_type_id,
      event_type_name: type?.name ?? null,
      num_seats_available: parseInt(evt.num_seats_available, 10),
      status: evt.status,
      online_booking_url: evt.online_booking_url,
      departure_location_name: evt.departure_location_name,
      departure_location_address: evt.departure_location_address,
      last_synced_at: new Date().toISOString(),
    }

    try {
      const upserted = await prisma.scheduledEvent.upsert({
        where: {
          sourceId_sourceType: {
            sourceId: evt.id,
            sourceType: SOURCE_TYPE,
          },
        },
        create: {
          title,
          date: dateOnly,
          startTime,
          endTime,
          eventType: 'CRUISE',
          status: 'DRAFT',
          sourceId: evt.id,
          sourceType: SOURCE_TYPE,
          sourceMetadata,
          notes: evt.public_notes || null,
          createdById: systemUser.id,
        },
        update: {
          title,
          startTime,
          endTime,
          sourceMetadata,
          // Intentionally NOT updating: status, notes, date
          // Laura's internal notes are preserved; crew assignments are untouched
        },
      })

      // Detect create vs update: newly created rows have identical createdAt and updatedAt
      const wasCreated = upserted.createdAt.getTime() === upserted.updatedAt.getTime()
      if (wasCreated) result.created++
      else result.updated++

    } catch (err) {
      result.errors.push(`Event ${evt.id}: ${err instanceof Error ? err.message : 'unknown error'}`)
    }
  }

  // Cancellation pass: synced events in the window that weren't in Starboard's response
  const previouslySynced = await prisma.scheduledEvent.findMany({
    where: {
      sourceType: SOURCE_TYPE,
      date: { gte: new Date(fromDate), lte: new Date(throughDate) },
      status: { not: 'CANCELLED' },
    },
    select: { id: true, sourceId: true },
  })

  for (const evt of previouslySynced) {
    if (evt.sourceId && !seenSourceIds.has(evt.sourceId)) {
      await prisma.scheduledEvent.update({
        where: { id: evt.id },
        data: { status: 'CANCELLED' },
      })
      result.cancelled++
    }
  }

  return result
}
