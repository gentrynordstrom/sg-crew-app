import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

async function main() {
  const name = process.env.ADMIN_NAME?.trim();
  const rawPhone = process.env.ADMIN_PHONE?.trim();
  const explicitPin = process.env.ADMIN_PIN?.trim();

  if (!name) {
    throw new Error("ADMIN_NAME is required for seeding.");
  }
  if (!rawPhone) {
    throw new Error("ADMIN_PHONE is required for seeding.");
  }

  const phone = normalizePhone(rawPhone);
  if (!/^\d{10}$/.test(phone)) {
    throw new Error(
      `ADMIN_PHONE must contain exactly 10 digits after stripping non-digits (got "${phone}").`
    );
  }

  let pin = phone.slice(-4);
  if (explicitPin) {
    if (!/^\d{4}$/.test(explicitPin)) {
      throw new Error("ADMIN_PIN must be exactly 4 digits if set.");
    }
    pin = explicitPin;
  }

  const pinHash = await bcrypt.hash(pin, 10);

  const existing = await prisma.user.findUnique({ where: { phone } });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        role: "ADMIN",
        isActive: true,
        failedAttempts: 0,
        lockedUntil: null,
        pinHash,
      },
    });
    console.log(
      `Updated bootstrap admin: ${updated.name} (${updated.phone}) — PIN reset to last 4 of phone.`
    );
  } else {
    const created = await prisma.user.create({
      data: {
        name,
        phone,
        pinHash,
        role: "ADMIN",
        isActive: true,
      },
    });
    console.log(
      `Created bootstrap admin: ${created.name} (${created.phone}).`
    );
  }

  console.log(
    `Login with name "${name}" and PIN "${pin}".`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
