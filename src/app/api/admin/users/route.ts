import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const [users, lastLogins, lastAiUsages, lastPayments] = await Promise.all([
    prisma.user.findMany({
      include: { subscription: true, teacher: true },
      orderBy: { createdAt: "desc" },
    }),
    // Lần đăng nhập gần nhất mỗi tài khoản (1 dòng Session = 1 lần login).
    prisma.session.groupBy({ by: ["userId"], _max: { createdAt: true } }),
    // Lần dùng tính năng AI gần nhất mỗi tài khoản.
    prisma.aiUsage.groupBy({ by: ["userId"], _max: { createdAt: true } }),
    // Lần thanh toán gần nhất mỗi tài khoản.
    prisma.payment.groupBy({ by: ["userId"], _max: { createdAt: true } }),
  ]);

  // "Hoạt động gần nhất" = mốc mới nhất trong 3 nguồn (đăng nhập / dùng AI /
  // thanh toán) — phản ánh đúng hành động thật của người dùng, không suy
  // đoán "đang online" (session sống tới 30 ngày kể cả khi không mở web
  // nữa). Đồng nhất với cách tính ở trang chi tiết tài khoản.
  const lastActiveMap = new Map<string, Date>();
  const applyMax = (userId: string | null | undefined, at: Date | null | undefined) => {
    if (!userId || !at) return;
    const current = lastActiveMap.get(userId);
    if (!current || at > current) lastActiveMap.set(userId, at);
  };
  for (const row of lastLogins) applyMax(row.userId, row._max.createdAt);
  for (const row of lastAiUsages) applyMax(row.userId, row._max.createdAt);
  for (const row of lastPayments) applyMax(row.userId, row._max.createdAt);

  return NextResponse.json({
    success: true,
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
      isLocked: u.isLocked,
      schoolName: u.teacher?.schoolName || null,
      phone: u.teacher?.phone || null,
      subscription: u.subscription,
      lastActiveAt: lastActiveMap.get(u.id)?.toISOString() || null,
    })),
  });
}
