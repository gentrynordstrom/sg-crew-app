const STARBOARD_TOKEN = process.env.STARBOARD_API_TOKEN
const STARBOARD_SUBDOMAIN = process.env.STARBOARD_SUBDOMAIN

if (!STARBOARD_TOKEN || !STARBOARD_SUBDOMAIN) {
  // Don't throw at import time — only when actually used
  console.warn('Starboard env vars not set — sync will fail when invoked')
}

const BASE_URL = `https://${STARBOARD_SUBDOMAIN}.starboardsuite.com/api/v1`

export interface StarboardEvent {
  id: string
  event_type_id: string
  event_start_datetime: string  // ISO 8601 with timezone offset
  event_end_datetime: string
  online_booking_cutoff_datetime: string
  online_booking_url: string
  public_notes: string
  num_seats_available: string  // Starboard returns this as a string
  status: 'Available' | 'Full' | 'Call for Availability'
  departure_location_name: string
  departure_location_address: string
  parent_departure_location_name: string
}

export interface StarboardEventType {
  id: string
  name: string
  description: string
  parent_id: string
  duration_in_minutes: string
}

interface StarboardResponse<T> {
  version: string
  messages: string[]
  data: T[]
}

export interface StarboardMetadata {
  event_type_id: string
  event_type_name: string | null
  num_seats_available: number
  status: string
  online_booking_url: string
  departure_location_name: string
  departure_location_address: string
  last_synced_at: string
}

const headers = () => ({
  'Authorization': `Bearer ${STARBOARD_TOKEN}`,
  'Content-Type': 'application/vnd.api+json',
  'User-Agent': 'ClientWebsite',
})

export async function fetchPublicEvents(
  fromDate: string,  // YYYY-MM-DD
  throughDate: string,
  eventTypeId?: string
): Promise<StarboardEvent[]> {
  const params = new URLSearchParams({
    from_date: fromDate,
    through_date: throughDate,
  })
  if (eventTypeId) params.set('event_type_id', eventTypeId)

  const url = `${BASE_URL}/public-events?${params}`
  const res = await fetch(url, { headers: headers() })

  if (!res.ok) {
    throw new Error(`Starboard API error: ${res.status} ${res.statusText}`)
  }

  const json: StarboardResponse<StarboardEvent> = await res.json()
  return json.data
}

export async function fetchPublicEventTypes(
  parentId?: string
): Promise<StarboardEventType[]> {
  const params = new URLSearchParams()
  if (parentId) params.set('parent_id', parentId)

  const url = `${BASE_URL}/public-event-types?${params}`
  const res = await fetch(url, { headers: headers() })

  if (!res.ok) {
    throw new Error(`Starboard API error: ${res.status} ${res.statusText}`)
  }

  const json: StarboardResponse<StarboardEventType> = await res.json()
  return json.data
}

// Cache event types in memory for the duration of a single import run
// to avoid hitting the rate limit
let eventTypeCache: Map<string, StarboardEventType> | null = null

export async function getEventTypeMap(): Promise<Map<string, StarboardEventType>> {
  if (eventTypeCache) return eventTypeCache

  const types = await fetchPublicEventTypes()
  eventTypeCache = new Map(types.map(t => [t.id, t]))
  return eventTypeCache
}

export function clearEventTypeCache() {
  eventTypeCache = null
}
