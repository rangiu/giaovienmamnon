import { prisma } from "../prisma";

export interface TemplateSection {
  key: string;
  heading: string;
  description?: string;
  contentType: "text" | "list" | "table";
  tableColumns?: string[];
}

export interface TemplateStructure {
  title: string;
  domainOrType: string;
  description: string;
  sections: TemplateSection[];
}

export const SYSTEM_VERIFIED_TEMPLATES: Array<{
  id: string;
  title: string;
  description: string;
  fileFormat: string;
  structure: TemplateStructure;
}> = [
  {
    id: "system-template-traditional",
    title: "Mẫu Giáo Án Truyền Thống (Bộ GD&ĐT)",
    description: "Khung giáo án 4 phần chuẩn theo quy định mầm non của Bộ Giáo dục & Đào tạo.",
    fileFormat: "system",
    structure: {
      title: "Mẫu Giáo Án Truyền Thống Mầm Non",
      domainOrType: "Chuẩn Bộ GD&ĐT",
      description: "Khung giáo án 4 phần: Mục tiêu, Chuẩn bị, Tiến hành hoạt động, Đánh giá/Mở rộng.",
      sections: [
        {
          key: "objectives",
          heading: "I. MỤC TIÊU BÀI HỌC",
          description: "1. Kiến thức: Trẻ hiểu/nhận biết/nêu được những gì.\n2. Kỹ năng: Kỹ năng quan sát, ghi nhớ, rèn luyện tư duy, giao tiếp.\n3. Thái độ: Trẻ hứng thú tham gia, ngoan ngoãn, biết hợp tác.",
          contentType: "list",
        },
        {
          key: "preparation",
          heading: "II. CHUẨN BỊ",
          description: "1. Đồ dùng của cô (tranh ảnh, giáo án điện tử, vật mẫu).\n2. Đồ dùng của trẻ (màu vẽ, đất nặn, dụng cụ học tập).\n3. Địa điểm & Không gian lớp học.",
          contentType: "list",
        },
        {
          key: "procedure",
          heading: "III. TIẾN HÀNH HOẠT ĐỘNG",
          description: "Diễn biến chi tiết tiết học chia thành các hoạt động.",
          contentType: "table",
          tableColumns: ["Hoạt động của Cô", "Hoạt động của Trẻ"],
        },
        {
          key: "assessment",
          heading: "IV. ĐÁNH GIÁ & CỦNG CỐ",
          description: "Tuyên dương, nhận xét giờ học, dặn dò và mở rộng kiến thức.",
          contentType: "text",
        },
      ],
    },
  },
  {
    id: "system-template-5e",
    title: "Mẫu Giáo Án 5E (Mầm Non Hiện Đại)",
    description: "Khung giáo án 5 bước: Engage (Gắn kết), Explore (Khám phá), Explain (Giải thích), Elaborate (Củng cố), Evaluate (Đánh giá).",
    fileFormat: "system",
    structure: {
      title: "Mẫu Giáo Án Mô Hình 5E",
      domainOrType: "Mô hình 5E",
      description: "Phương pháp giáo dục hiện đại lấy trẻ làm trung tâm qua 5 bước chuyển tiếp.",
      sections: [
        {
          key: "objectives",
          heading: "1. MỤC TIÊU BÀI HỌC (5E)",
          description: "Nêu rõ mục tiêu kiến thức, kỹ năng 5E và thái độ hứng thú của trẻ.",
          contentType: "list",
        },
        {
          key: "preparation",
          heading: "2. CHUẨN BỊ MÔ HÌNH 5E",
          description: "Thiết bị, dụng cụ thí nghiệm/khám phá, nguyên vật liệu mở cho trẻ.",
          contentType: "text",
        },
        {
          key: "step_engage",
          heading: "3.1. ENGAGE - GẮN KẾT (Gây chú ý & kích thích tò mò)",
          description: "Hoạt động khởi động, câu đố, bài hát, tình huống tạo hứng thú.",
          contentType: "table",
          tableColumns: ["Hoạt động của Cô", "Hoạt động của Trẻ"],
        },
        {
          key: "step_explore",
          heading: "3.2. EXPLORE - KHÁM PHÁ (Trẻ trực tiếp trải nghiệm)",
          description: "Trẻ quan sát, sờ, ngửi, làm thí nghiệm, thảo luận nhóm.",
          contentType: "table",
          tableColumns: ["Hoạt động của Cô", "Hoạt động của Trẻ"],
        },
        {
          key: "step_explain",
          heading: "3.3. EXPLAIN - GIẢI THÍCH (Chia sẻ & Đúc kết)",
          description: "Trẻ trình bày kết quả khám phá, cô hỗ trợ tổng kết kiến thức chuẩn.",
          contentType: "table",
          tableColumns: ["Hoạt động của Cô", "Hoạt động của Trẻ"],
        },
        {
          key: "step_elaborate",
          heading: "3.4. ELABORATE - CỦNG CỐ & ÁP DỤNG",
          description: "Trò chơi vận dụng, mở rộng tình huống thực tế đời sống.",
          contentType: "table",
          tableColumns: ["Hoạt động của Cô", "Hoạt động của Trẻ"],
        },
        {
          key: "step_evaluate",
          heading: "3.5. EVALUATE - ĐÁNH GIÁ (Quan sát & Nhận xét)",
          description: "Đánh giá mức độ đạt mục tiêu của trẻ, khen ngợi và động viên.",
          contentType: "text",
        },
      ],
    },
  },
  {
    id: "system-template-steam",
    title: "Mẫu Giáo Án STEAM (Trải Nghiệm & Chế Tạo)",
    description: "Tích hợp Khoa học (S), Công nghệ (T), Kỹ thuật (E), Nghệ thuật (A), Toán học (M).",
    fileFormat: "system",
    structure: {
      title: "Mẫu Giáo Án Ứng Dụng STEAM",
      domainOrType: "Giáo dục STEAM",
      description: "Tiết học trải nghiệm tích hợp liên môn và thiết kế sản phẩm.",
      sections: [
        {
          key: "steam_elements",
          heading: "I. YẾU TỐ STEAM TÍCH HỢP",
          description: "- S (Science): Kiến thức khoa học trẻ khám phá.\n- T (Technology): Công nghệ/dụng cụ sử dụng.\n- E (Engineering): Quy trình thiết kế & chế tạo.\n- A (Art): Tính thẩm mỹ, trang trí sản phẩm.\n- M (Math): Đếm, đo lường, hình khối, so sánh.",
          contentType: "list",
        },
        {
          key: "objectives",
          heading: "II. MỤC TIÊU BÀI HỌC",
          description: "Mục tiêu cụ thể về kiến thức, kỹ năng STEAM và thái độ của trẻ.",
          contentType: "list",
        },
        {
          key: "preparation",
          heading: "III. CHUẨN BỊ NGUYÊN VẬT LIỆU STEAM",
          description: "Nguyên vật liệu tái chế, dụng cụ tạo hình, bản vẽ thiết kế mẫu.",
          contentType: "text",
        },
        {
          key: "steam_process",
          heading: "IV. TIẾN TRÌNH KHÁM PHÁ STEAM",
          description: "Quy trình EDP (Engineering Design Process) gồm các bước: Hỏi -> Tưởng tượng -> Thiết kế -> Chế tạo -> Cải tiến.",
          contentType: "table",
          tableColumns: ["Hoạt động của Cô", "Hoạt động của Trẻ"],
        },
        {
          key: "product_sharing",
          heading: "V. TRƯNG BÀY & CHIA SẺ SẢN PHẨM",
          description: "Trẻ giới thiệu sản phẩm STEAM, nêu ý tưởng và đánh giá sản phẩm của bạn.",
          contentType: "text",
        },
      ],
    },
  },
];

/**
 * Đảm bảo 3 mẫu giáo án chuẩn hệ thống luôn sẵn sàng trong Database.
 */
export async function ensureSystemTemplatesInDb() {
  try {
    for (const tpl of SYSTEM_VERIFIED_TEMPLATES) {
      await prisma.lessonTemplate.upsert({
        where: { id: tpl.id },
        update: {
          title: tpl.title,
          description: tpl.description,
          structureJson: JSON.stringify(tpl.structure),
          isSystem: true,
          status: "APPROVED",
        },
        create: {
          id: tpl.id,
          title: tpl.title,
          description: tpl.description,
          fileFormat: tpl.fileFormat,
          structureJson: JSON.stringify(tpl.structure),
          isSystem: true,
          status: "APPROVED",
        },
      });
    }
  } catch (err) {
    console.error("Error seeding system templates:", err);
  }
}
