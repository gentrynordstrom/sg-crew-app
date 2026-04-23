export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function isValidPhone(digits: string): boolean {
  return /^\d{10}$/.test(digits);
}

export function derivePinFromPhone(digits: string): string {
  if (!isValidPhone(digits)) {
    throw new Error("Phone must be 10 digits before deriving PIN");
  }
  return digits.slice(-4);
}

export function formatPhone(digits: string): string {
  if (!/^\d{10}$/.test(digits)) return digits;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
