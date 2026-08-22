import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed CHỈ dữ liệu tham chiếu dùng chung toàn hệ thống (6 lĩnh vực phát
 * triển + 10 mục tiêu đánh giá MT3..MT66 + 1 quy tắc đạt/chưa đạt).
 *
 * KHÁC với prisma/seed.ts (script demo cũ): script đó xoá SẠCH mọi User/
 * Teacher/Student/Topic rồi tạo tài khoản + 12 học sinh + báo cáo demo giả
 * — không được chạy trên production vì sẽ xoá mất tài khoản/dữ liệu thật.
 *
 * Script này dùng upsert theo "code" (khoá unique), an toàn để chạy nhiều
 * lần và chạy trên production: không xoá, không đụng tới User/Teacher/
 * Student/Class/Topic của bất kỳ ai.
 */
async function main() {
  console.log("🌱 Seeding reference data (domains + objectives + rule)...");

  const domainsData = [
    { code: "LANG", name: "Ngôn ngữ", color: "sky", icon: "MessageSquare", orderIndex: 1 },
    { code: "COG", name: "Nhận thức & Khám phá", color: "emerald", icon: "Brain", orderIndex: 2 },
    { code: "PHYS", name: "Thể chất & Vận động", color: "amber", icon: "Activity", orderIndex: 3 },
    { code: "SOC_EMO", name: "Tình cảm & Kỹ năng xã hội", color: "rose", icon: "Heart", orderIndex: 4 },
    { code: "AES", name: "Thẩm mỹ", color: "purple", icon: "Palette", orderIndex: 5 },
    { code: "SELF_HELP", name: "Kỹ năng tự phục vụ", color: "teal", icon: "Sparkles", orderIndex: 6 },
  ];

  for (const d of domainsData) {
    await prisma.developmentDomain.upsert({
      where: { code: d.code },
      update: { name: d.name, color: d.color, icon: d.icon, orderIndex: d.orderIndex },
      create: d,
    });
  }
  console.log(`✅ Upserted ${domainsData.length} development domains.`);

  const objectivesData = [
    { code: "MT3", name: "Động tác thể dục cơ bản", description: "Thực hiện đúng động tác hô hấp, tay, lưng, bụng, chân.", domainCode: "PHYS" },
    { code: "MT6", name: "Trèo lên xuống thang", description: "Trèo lên xuống thang ở độ cao 1.5m nhẹ nhàng.", domainCode: "PHYS" },
    { code: "MT7", name: "Thăng bằng trên ghế", description: "Giữ được thăng bằng cơ thể khi đi trên ghế thể dục.", domainCode: "PHYS" },
    { code: "MT12", name: "Dinh dưỡng tốt sức khỏe", description: "Trẻ biết chọn và ăn một số thực phẩm tốt cho sức khỏe.", domainCode: "SELF_HELP" },
    { code: "MT21", name: "Vệ sinh tự phục vụ", description: "Tự rửa tay bằng xà phòng, tự dọn dẹp sau khi ăn.", domainCode: "SELF_HELP" },
    { code: "MT33", name: "Kích thước & số lượng 5", description: "Nhận biết, so sánh kích thước, số lượng trong phạm vi 5.", domainCode: "COG" },
    { code: "MT45", name: "Đặc điểm Cây - Hoa - Quả", description: "Nói được tên, đặc điểm nổi bật của một số loại cây, hoa, quả.", domainCode: "COG" },
    { code: "MT52", name: "Giao tiếp tự tin", description: "Lắng nghe, trao đổi tự tin với cô giáo và các bạn.", domainCode: "LANG" },
    { code: "MT59", name: "Cảm thụ âm nhạc & tạo hình", description: "Hát đúng giai điệu, thể hiện cảm xúc qua âm nhạc và tạo hình.", domainCode: "AES" },
    { code: "MT66", name: "Hợp tác & Chia sẻ", description: "Biết chia sẻ đồ chơi và hợp tác cùng các bạn.", domainCode: "SOC_EMO" },
  ];

  for (const o of objectivesData) {
    await prisma.assessmentObjective.upsert({
      where: { code: o.code },
      update: { name: o.name, description: o.description, domainCode: o.domainCode },
      create: { ...o, ageGroup: "4–5 tuổi" },
    });
  }
  console.log(`✅ Upserted ${objectivesData.length} assessment objectives.`);

  const existingRule = await prisma.assessmentRule.findFirst();
  if (!existingRule) {
    await prisma.assessmentRule.create({
      data: { name: "Quy tắc Đánh giá Mầm non 80%", minimumPercentage: 80.0, allowPendingState: true },
    });
    console.log("✅ Created default assessment rule (80%).");
  } else {
    console.log("ℹ️  Assessment rule already exists, skipped.");
  }

  console.log("🎉 Reference data seed completed — không đụng tới User/Teacher/Student/Topic nào.");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
