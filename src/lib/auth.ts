import { cookies } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma, getOrCreateTeacherAndClassForUser } from "./prisma";

export const SESSION_COOKIE_NAME = "coai_session";
const SESSION_TTL_DAYS = 30;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Tạo phiên đăng nhập mới cho user: sinh token ngẫu nhiên, chỉ lưu bản HASH
 * của token vào DB (giống cách lưu mật khẩu) — token gốc chỉ tồn tại trong
 * cookie phía trình duyệt, không bao giờ lưu dạng thô ở server.
 */
export async function createSession(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt,
    },
  });

  return rawToken;
}

export async function destroySession(rawToken: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(rawToken) } });
}

/**
 * Đọc cookie phiên đăng nhập hiện tại (nếu có), trả về user tương ứng.
 * Dùng trong Server Component / Route Handler.
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: {
      user: {
        include: { teacher: true, subscription: true },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.user;
}

export type AccessReason = "LOCKED" | "ADMIN" | "ACTIVE" | "TRIALING" | "FREE" | "PENDING" | "EXPIRED" | "NO_SUBSCRIPTION";
export type AccessTier = "FULL" | "LIMITED" | "BLOCKED";

/**
 * Trạng thái truy cập hệ thống dựa trên subscription hiện tại.
 *
 * - LOCKED   = admin khoá thủ công → BLOCKED hoàn toàn, kiểm tra TRƯỚC cả
 *              quyền admin (phòng khi 1 admin bị admin khác khoá).
 * - PENDING  = mới đăng ký, CHƯA bấm link xác minh email → BLOCKED hoàn
 *              toàn, không cần admin can thiệp, chỉ cần tự xác minh email.
 * - FREE     = đã xác minh email, chưa có gói trả phí (hoặc gói/dùng thử đã
 *              hết hạn) → LIMITED: vào được hệ thống, chỉ dùng Chat cơ bản
 *              có giới hạn lượt/ngày, các tính năng AI khác bị khoá.
 * - TRIALING/ACTIVE (còn hạn) hoặc ADMIN → FULL: dùng toàn bộ tính năng.
 */
export function getAccessStatus(
  subscription: { status: string; trialEndsAt: Date | null; currentPeriodEnd: Date | null } | null,
  isAdmin = false,
  isLocked = false
): { allowed: boolean; tier: AccessTier; reason: AccessReason } {
  if (isLocked) return { allowed: false, tier: "BLOCKED", reason: "LOCKED" };
  if (isAdmin) return { allowed: true, tier: "FULL", reason: "ADMIN" };
  if (!subscription) return { allowed: false, tier: "BLOCKED", reason: "NO_SUBSCRIPTION" };

  if (subscription.status === "PENDING") {
    return { allowed: false, tier: "BLOCKED", reason: "PENDING" };
  }

  const now = new Date();
  if (subscription.status === "ACTIVE" && subscription.currentPeriodEnd && subscription.currentPeriodEnd > now) {
    return { allowed: true, tier: "FULL", reason: "ACTIVE" };
  }
  if (subscription.status === "TRIALING" && subscription.trialEndsAt && subscription.trialEndsAt > now) {
    return { allowed: true, tier: "FULL", reason: "TRIALING" };
  }
  if (subscription.status === "ACTIVE" || subscription.status === "TRIALING") {
    // Đã từng trả phí/được tặng dùng thử nhưng hết hạn — không khoá hẳn,
    // hạ về mức miễn phí giới hạn để cô vẫn vào gia hạn được dễ dàng.
    return { allowed: true, tier: "LIMITED", reason: "EXPIRED" };
  }
  // FREE hoặc CANCELLED — đã xác minh email, dùng bản giới hạn.
  return { allowed: true, tier: "LIMITED", reason: "FREE" };
}

/**
 * Helper dùng chung: "đã đăng nhập + email đã xác minh" (tier FULL hoặc
 * LIMITED đều qua được — chỉ chặn khi CHƯA xác minh email). Trả về sẵn
 * context (user, teacher, currentClass, access) để route tự quyết định có
 * cần tính năng FULL hay không, hoặc trả về 1 NextResponse lỗi (401/403).
 */
export async function requireActiveUser() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Chưa đăng nhập.", code: "UNAUTHENTICATED" }, { status: 401 });
  }

  const access = getAccessStatus(user.subscription, user.role === "admin", user.isLocked);
  if (!access.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Tài khoản chưa xác minh email. Vui lòng kiểm tra hộp thư Gmail để kích hoạt tài khoản.",
        code: "ACCESS_DENIED",
        accessReason: access.reason,
      },
      { status: 403 }
    );
  }

  const { teacher, currentClass } = await getOrCreateTeacherAndClassForUser(user.id);
  return { user, teacher, currentClass, access };
}

/**
 * Helper cho các tính năng CHỈ dành cho gói FULL (trả phí ACTIVE hoặc được
 * admin tặng TRIALING còn hạn / admin). Tài khoản FREE/EXPIRED (LIMITED)
 * vẫn đăng nhập được nhưng bị chặn ở đúng route này với thông báo nâng cấp
 * gói, thay vì bị chặn khỏi cả hệ thống như trước.
 */
export async function requireFullAccess() {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;

  if (ctx.access.tier !== "FULL") {
    return NextResponse.json(
      {
        success: false,
        error: "Tính năng này chỉ dành cho gói trả phí. Vui lòng nâng cấp gói tháng để sử dụng đầy đủ.",
        code: "UPGRADE_REQUIRED",
        accessReason: ctx.access.reason,
      },
      { status: 403 }
    );
  }

  return ctx;
}

/**
 * Helper cho các route chỉ cần "đã đăng nhập" mà KHÔNG cần kiểm tra đã
 * xác minh email hay chưa (VD: route gửi lại email xác minh — chính tài
 * khoản đang chờ xác minh phải gọi được route này).
 */
export async function requireSession() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Chưa đăng nhập.", code: "UNAUTHENTICATED" }, { status: 401 });
  }
  return { user };
}

/** Helper cho các API route chỉ dành cho quản trị viên (role = "admin"). */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Chưa đăng nhập.", code: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Chỉ quản trị viên mới có quyền truy cập.", code: "FORBIDDEN" }, { status: 403 });
  }
  return { user };
}
