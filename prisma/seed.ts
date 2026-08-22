import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Full Comprehensive Database Seed for Cô AI...");

  // Clean existing demo data safely
  await prisma.topicReport.deleteMany({});
  await prisma.studentTopicResult.deleteMany({});
  await prisma.observationObjectiveLink.deleteMany({});
  await prisma.topicObjective.deleteMany({});
  await prisma.assessmentObjective.deleteMany({});
  await prisma.topic.deleteMany({});
  await prisma.assessmentRule.deleteMany({});
  await prisma.aiUsage.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.lesson.deleteMany({});
  await prisma.assessmentReport.deleteMany({});
  await prisma.studentAssessment.deleteMany({});
  await prisma.observation.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.class.deleteMany({});
  await prisma.assessmentPeriod.deleteMany({});
  await prisma.developmentDomain.deleteMany({});
  await prisma.teacher.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Create Assessment Rule (Threshold 80%)
  await prisma.assessmentRule.create({
    data: {
      name: "Quy tắc Đánh giá Mầm non 80%",
      minimumPercentage: 80.0,
      allowPendingState: true,
    },
  });

  // 2. Create 6 Core Development Domains
  const domainsData = [
    { code: "LANG", name: "Ngôn ngữ", color: "sky", icon: "MessageSquare", orderIndex: 1 },
    { code: "COG", name: "Nhận thức & Khám phá", color: "emerald", icon: "Brain", orderIndex: 2 },
    { code: "PHYS", name: "Thể chất & Vận động", color: "amber", icon: "Activity", orderIndex: 3 },
    { code: "SOC_EMO", name: "Tình cảm & Kỹ năng xã hội", color: "rose", icon: "Heart", orderIndex: 4 },
    { code: "AES", name: "Thẩm mỹ", color: "purple", icon: "Palette", orderIndex: 5 },
    { code: "SELF_HELP", name: "Kỹ năng tự phục vụ", color: "teal", icon: "Sparkles", orderIndex: 6 },
  ];

  const domainsMap = new Map<string, any>();
  for (const d of domainsData) {
    const domain = await prisma.developmentDomain.create({ data: d });
    domainsMap.set(d.code, domain);
  }

  // 3. Create Assessment Period
  const currentPeriod = await prisma.assessmentPeriod.create({
    data: {
      name: "Tháng 8/2026",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-08-31"),
      isCurrent: true,
    },
  });

  // 4. Create Demo Teacher User (mật khẩu demo: "demo123456" — chỉ dùng để
  // test local, đổi ngay nếu triển khai thật)
  const demoPasswordHash = await bcrypt.hash("demo123456", 10);
  const demoUser = await prisma.user.create({
    data: {
      email: "colan@mamnon.edu.vn",
      name: "Cô Nguyễn Thị Lan",
      passwordHash: demoPasswordHash,
      role: "teacher",
      teacher: {
        create: {
          schoolName: "Trường Mầm Non Họa Mi",
          className: "Lớp Mầm 1",
          ageGroup: "4–5 tuổi",
          studentCount: 12,
          currentTopic: "Cây – Hoa – Quả – Mùa xuân",
          teachingStyle: "Học qua chơi, lấy trẻ làm trung tâm, chú trọng phát triển cảm xúc và kỹ năng xã hội",
        },
      },
    },
    include: { teacher: true },
  });
  const teacherId = demoUser.teacher!.id;

  // Tài khoản demo được kích hoạt sẵn (ACTIVE 1 năm) để tiện test local
  await prisma.subscription.create({
    data: {
      userId: demoUser.id,
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  // 5. Create Class
  const demoClass = await prisma.class.create({
    data: {
      teacherId,
      name: "Lớp Mầm 1",
      ageGroup: "4–5 tuổi",
      schoolYear: "2025-2026",
    },
  });

  // 6. Create 10 Objectives (MT3, MT6, MT7, MT12, MT21, MT33, MT45, MT52, MT59, MT66)
  const objectivesData = [
    { code: "MT3", name: "Động tác thể dục cơ bản", description: "Thực hiện đúng động tác hô hấp, tay, lưng, bụng, chân.", domainCode: "PHYS" },
    { code: "MT6", name: "Trèo lên xuống thang", description: "Trèo lên xuống thang ở độ cao 1.5m nhẹ nhàng.", domainCode: "PHYS" },
    { code: "MT7", name: "Thăng bằng trên ghế", description: "Giữ được thăng bằng cơ thể khi đi trên ghế thể dục.", domainCode: "PHYS" },
    { code: "MT12", name: "Dinh dưỡng tốt sức khỏe", description: "Trẻ biết chọn và ăn một số thực phẩm tốt cho sức khỏe.", domainCode: "SELF_HELP" },
    { code: "MT21", name: "Vệ sinh tự phục vụ", description: "Tự rửa tay bằng xà phòng, tự dọn dẹp sau khi ăn.", domainCode: "SELF_HELP" },
    { code: "MT33", name: "Kích thước & số lượng 5", description: "Nhận biết, so sánh kích thước, số lượng trong phạm vi 5.", domainCode: "COG" },
    { code: "MT45", name: "Đặc điểm Cây - Hoa - Quả", description: "Nói được tên, đặc điểm nổi bật của một số loại cây, hoa, quả.", domainCode: "COG" },
    { code: "MT52", name: "Giao tiếp tự tin", description: "Lắng nghe, trao đổi tự tin với cô giáo và các bạn.", domainCode: "LANG" },
    { code: "MT59", name: "Hát bài hát Mùa xuân", description: "Hát đúng giai điệu và thể hiện cảm xúc bài hát mùa xuân.", domainCode: "AES" },
    { code: "MT66", name: "Hợp tác & Chia sẻ", description: "Biết chia sẻ đồ chơi và hợp tác cùng các bạn.", domainCode: "SOC_EMO" },
  ];

  const createdObjectives = [];
  for (const obj of objectivesData) {
    const createdObj = await prisma.assessmentObjective.create({
      data: {
        code: obj.code,
        name: obj.name,
        description: obj.description,
        domainCode: obj.domainCode,
        ageGroup: "4–5 tuổi",
      },
    });
    createdObjectives.push(createdObj);
  }
  console.log(`✅ Created ${createdObjectives.length} Assessment Objectives.`);

  // 7. Create Topic: "Cây – Hoa – Quả – Mùa xuân"
  const topic = await prisma.topic.create({
    data: {
      classId: demoClass.id,
      name: "Cây – Hoa – Quả – Mùa xuân",
      ageGroup: "4–5 tuổi",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-08-25"),
      teacherNotes: "Đa số các cháu tham gia học tập tích cực, đạt được các mục tiêu phát triển thể chất, nhận thức, ngôn ngữ, thẩm mỹ và tình cảm xã hội theo chủ đề Cây - Hoa - Quả - Mùa xuân. Một số trẻ rụt rè cần được tiếp tục động viên trong các hoạt động nhóm.",
      status: "ACTIVE",
    },
  });

  // Link 10 Objectives to Topic
  for (let i = 0; i < createdObjectives.length; i++) {
    await prisma.topicObjective.create({
      data: {
        topicId: topic.id,
        objectiveId: createdObjectives[i].id,
        orderIndex: i + 1,
      },
    });
  }

  // 8. Create 12 Demo Students matching realistic sample
  const studentsRoster = [
    { name: "Lý Tuấn Đạt", gender: "Bé trai", dob: "12/03/2021", notes: "Cần luyện tập thêm bài tập thăng bằng và gọi tên cây quả." },
    { name: "Sùng Văn Hình", gender: "Bé trai", dob: "05/06/2021", notes: "Ngoan ngoãn, hoàn thành xuất sắc các mục tiêu chủ đề." },
    { name: "Nguyễn Minh", gender: "Bé trai", dob: "15/05/2021", notes: "Tự giác xúc ăn, hiếu động, tư duy phân loại nhanh." },
    { name: "Trần An", gender: "Bé gái", dob: "20/08/2021", notes: "Giao tiếp tự tin, hát múa đẹp." },
    { name: "Lê Mai", gender: "Bé gái", dob: "02/02/2021", notes: "Ghi nhớ nhanh, tự dọn dẹp góc chơi." },
    { name: "Phạm Nam", gender: "Bé trai", dob: "10/11/2021", notes: "Tập trung tốt khi quan sát tranh ảnh." },
    { name: "Hoàng Đức Anh", gender: "Bé trai", dob: "18/04/2021", notes: "Hào hứng tham gia vận động nhóm." },
    { name: "Vũ Khánh Linh", gender: "Bé gái", dob: "25/09/2021", notes: "Tô màu đẹp, tự rửa tay trước khi ăn." },
    { name: "Đặng Quốc Bảo", gender: "Bé trai", dob: "08/01/2021", notes: "Nhận biết tốt hình khối và số lượng." },
    { name: "Bùi Ngọc Hà", gender: "Bé gái", dob: "30/07/2021", notes: "Rất thích hát bài hát về hoa quả." },
    { name: "Ngô Gia Huy", gender: "Bé trai", dob: "14/10/2021", notes: "Cần nhắc nhở cất đồ dùng sau khi ăn." },
    { name: "Dương Thảo Nhi", gender: "Bé gái", dob: "02/12/2021", notes: "Ngoan ngoãn, hòa đồng với các bạn." },
  ];

  const createdStudentsMap = new Map<string, any>();
  for (const s of studentsRoster) {
    const student = await prisma.student.create({
      data: {
        classId: demoClass.id,
        name: s.name,
        gender: s.gender,
        dateOfBirth: s.dob,
        notes: s.notes,
      },
    });
    createdStudentsMap.set(s.name, student);
  }

  // 9. Seed Ratings Matrix (+ / -) matching realistic statistics (10 / 12 Trẻ Đạt = 83.3%)
  // Lý Tuấn Đạt (Failed 3 objectives: MT7, MT45, MT66 -> 7/10 = 70% -> CHƯA ĐẠT)
  // Ngô Gia Huy (Failed 3 objectives: MT21, MT45, MT66 -> 7/10 = 70% -> CHƯA ĐẠT)
  // 10 students achieve >= 8/10 (80%+) -> ĐẠT

  for (const [name, student] of createdStudentsMap.entries()) {
    for (const obj of createdObjectives) {
      let rating = "+";

      if (name === "Lý Tuấn Đạt") {
        if (obj.code === "MT7" || obj.code === "MT45" || obj.code === "MT66") {
          rating = "-";
        }
      } else if (name === "Ngô Gia Huy") {
        if (obj.code === "MT21" || obj.code === "MT45" || obj.code === "MT66") {
          rating = "-";
        }
      } else if (name === "Phạm Nam" && obj.code === "MT45") {
        rating = "-";
      }

      await prisma.studentTopicResult.create({
        data: {
          topicId: topic.id,
          studentId: student.id,
          objectiveId: obj.id,
          rating,
        },
      });
    }
  }
  console.log("✅ Seeded Topic Rating Matrix (+ / -) for 12 students.");

  // 10. Seed Observation & Link to Objective MT21 for Nguyễn Minh
  const minh = createdStudentsMap.get("Nguyễn Minh")!;
  const mt21 = createdObjectives.find((o) => o.code === "MT21")!;

  const minhObs = await prisma.observation.create({
    data: {
      studentId: minh.id,
      activityContext: "Giờ ăn trưa",
      date: new Date("2026-08-10"),
      content: "Hôm nay Minh tự xúc ăn gần hết phần cơm của mình và biết tự dọn dẹp cất bát đĩa sau bữa ăn.",
      category: "Kỹ năng tự phục vụ",
      createdBy: "Cô Lan",
    },
  });

  await prisma.observationObjectiveLink.create({
    data: {
      observationId: minhObs.id,
      objectiveId: mt21.id,
    },
  });
  console.log("✅ Created Observation & Linked to Objective MT21 for Nguyễn Minh.");

  // 11. Create AI Topic Report
  await prisma.topicReport.create({
    data: {
      topicId: topic.id,
      classSummary: "10/12 trẻ (83.3%) hoàn thành chủ đề Cây – Hoa – Quả – Mùa xuân. Đa số các bé nắm vững kiến thức các loại hoa quả và thực hiện tốt động tác thể dục cơ bản.",
      strengthsSummary: "Mục tiêu MT3 (Động tác thể dục) và MT12 (Dinh dưỡng) đạt tỷ lệ cao nhất (100%). Các bé hát đúng giai điệu bài hát mùa xuân.",
      weakObjectivesSummary: "Mục tiêu MT45 (Nói tên & đặc điểm cây hoa quả) có tỷ lệ đạt thấp nhất (75.0%), cần tăng cường trải nghiệm thực tế.",
      studentsNeedingSupport: "Bé Lý Tuấn Đạt và bé Ngô Gia Huy cần được cô giáo tiếp tục hỗ trợ nhóm nhỏ trong hoạt động nhận biết hoa quả và chia sẻ đồ chơi.",
      recommendedActivities: "Tổ chức trò chơi góc thiên nhiên 'Bé làm vườn', trực tiếp sờ nắn gọt vỏ quả cam và phân loại lá cây.",
      evidenceGaps: "Mục tiêu MT45 hiện chưa có đủ hình ảnh minh chứng cá nhân cho 3 trẻ.",
    },
  });

  console.log("🎉 Full Database Seeding for Sổ Đánh Giá Trẻ Sau Chủ Đề completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
