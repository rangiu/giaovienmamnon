"use client";

import React, { useState } from "react";
import { Bookmark, BookmarkCheck, Loader2, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface SaveLessonBannerProps {
  content: string;
  structuredData?: any;
}

export function SaveLessonBanner({ content, structuredData }: SaveLessonBannerProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedLessonId, setSavedLessonId] = useState<string | null>(null);

  // Check if content is a lesson plan
  const isLessonPlan =
    Boolean(structuredData) ||
    content.toUpperCase().includes("GIÁO ÁN") ||
    (content.includes("MỤC ĐÍCH") && content.includes("CHUẨN BỊ"));

  if (!isLessonPlan) return null;

  // Extract lesson details from text or structured data
  const extractLessonPayload = () => {
    if (structuredData) return structuredData;

    // Helper regex extractors
    const extractMatch = (pattern: RegExp, defaultVal: string) => {
      const match = content.match(pattern);
      return match ? match[1].trim() : defaultVal;
    };

    const title = extractMatch(/(?:\*\*|##)?(?:Đề tài|Chủ đề|GIÁO ÁN HOẠT ĐỘNG)[^:\n]*:\s*\*?\*?([^\n\*]+)/i, "Giáo án Hoạt động Mầm non");
    const ageGroup = extractMatch(/(?:\*\*|##)?Lớp[^:\n]*:\s*\*?\*?([^\n\*]+)/i, "4–5 tuổi");
    const duration = extractMatch(/(?:\*\*|##)?Thời gian[^:\n]*:\s*\*?\*?([^\n\*]+)/i, "30–35 phút");

    return {
      title: title.replace(/\*+/g, "").trim(),
      ageGroup: ageGroup.replace(/\*+/g, "").trim(),
      duration: duration.replace(/\*+/g, "").trim(),
      topic: "Cây – Hoa – Quả – Mùa xuân",
      objectives: JSON.stringify({
        knowledge: "Trẻ nhận biết và mô tả được các đặc điểm chính của bài học.",
        skills: "Phát triển kỹ năng quan sát, lắng nghe và trả lời câu hỏi.",
        attitude: "Trẻ tích cực tham gia hoạt động cùng cô giáo và các bạn.",
      }),
      preparation: JSON.stringify({
        teacher: "Tranh ảnh minh họa, vật thật, dụng cụ học tập.",
        child: "Trang phục gọn gàng, tinh thần thoải mái.",
      }),
      teacherActivities: JSON.stringify([
        "Hát múa gây hứng thú đầu giờ.",
        "Hướng dẫn trẻ quan sát và thảo luận nội dung chính.",
        "Tổ chức trò chơi củng cố kiến thức.",
      ]),
      childActivities: JSON.stringify([
        "Lắng nghe cô giảng và tương tác sôi nổi.",
        "Quan sát học liệu và trả lời câu hỏi gợi mở.",
        "Tham gia trò chơi cùng các bạn.",
      ]),
      openQuestions: JSON.stringify([
        "Con thấy loại cây này có đặc điểm gì nổi bật?",
        "Vì sao chúng ta cần chăm sóc và bảo vệ cây xanh?",
      ]),
      reinforcementGame: JSON.stringify({
        name: "Trò chơi củng cố sáng tạo",
        rules: "Tuân thủ luật chơi nhẹ nhàng.",
        how_to_play: "Trẻ cùng nhau tham gia trò chơi góc mầm non.",
      }),
      conclusion: "Cô nhận xét, tuyên dương cả lớp và chuyển hoạt động.",
    };
  };

  const handleConfirmSave = async () => {
    if (isSaved) return;
    setSaving(true);

    try {
      const payload = extractLessonPayload();
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.lesson) {
        setIsSaved(true);
        setSavedLessonId(data.lesson.id);
      } else {
        alert(data.error || "Không thể lưu giáo án");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi khi kết nối để lưu giáo án");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md border border-emerald-400 space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs md:text-sm">
              {isSaved
                ? "🎉 Đã lưu Giáo án thành công vào Kho giáo án!"
                : "💾 Cô AI đã soạn xong Giáo án! Cô có muốn lưu ngay vào Kho giáo án không?"}
            </h4>
            <p className="text-[11px] text-emerald-100">
              {isSaved
                ? "Giáo án đã sẵn sàng để xem, chỉnh sửa và xuất file PDF A4."
                : "Nhấp xác nhận để tự động đưa giáo án này vào Kho giáo án của Cô."}
            </p>
          </div>
        </div>

        {!isSaved ? (
          <button
            onClick={handleConfirmSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs py-2.5 px-4 rounded-xl shadow-sm transition-all shrink-0 active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Bookmark className="w-4 h-4 text-slate-950" />
            )}
            <span>{saving ? "Đang lưu..." : "✓ Xác nhận Lưu vào Kho Giáo án"}</span>
          </button>
        ) : (
          <Link
            href="/lessons"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-emerald-50 text-emerald-900 font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-all shrink-0"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Mở Kho Giáo án ➔</span>
          </Link>
        )}
      </div>
    </div>
  );
}
