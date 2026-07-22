import { prisma } from "./prisma";

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimitMemory(
  key: string,
  limit: number,
  windowMs = 60 * 60 * 1000
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const entry = memoryBuckets.get(key);

  if (!entry || now > entry.resetAt) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { ok: false, remaining: 0 };
  }

  entry.count += 1;
  return { ok: true, remaining: limit - entry.count };
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs = 60 * 60 * 1000
): Promise<{ ok: boolean; remaining: number }> {
  const now = Date.now();
  const resetAt = new Date(now + windowMs);

  try {
    const bucket = await prisma.rateLimitBucket.findUnique({
      where: { key },
      select: { count: true, resetAt: true },
    });

    if (!bucket || bucket.resetAt.getTime() <= now) {
      await prisma.rateLimitBucket.upsert({
        where: { key },
        create: { key, count: 1, resetAt },
        update: { count: 1, resetAt },
      });
      return { ok: true, remaining: limit - 1 };
    }

    if (bucket.count >= limit) {
      return { ok: false, remaining: 0 };
    }

    const updated = await prisma.rateLimitBucket.update({
      where: { key },
      data: { count: { increment: 1 } },
      select: { count: true },
    });

    return { ok: true, remaining: Math.max(limit - updated.count, 0) };
  } catch (error) {
    console.warn("[rate-limit] fallback em memoria", error);
    return checkRateLimitMemory(key, limit, windowMs);
  }
}
