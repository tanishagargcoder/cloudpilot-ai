// The backend (Render) saves timestamps in UTC but without a timezone marker,
// e.g. "2026-07-10T07:44:21.123". Parsing that directly makes the browser
// treat it as local time, showing everything ~5.5h behind for IST users.
// This helper tags timezone-less strings as UTC so they render in local time.
export function parseServerDate(iso: string): Date {
  if (!iso) return new Date(NaN);
  const hasTz = /Z$|[+-]\d{2}:?\d{2}$/.test(iso);
  return new Date(hasTz ? iso : iso + "Z");
}
