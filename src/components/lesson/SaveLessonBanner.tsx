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

  // Nhận diện xem đây có THẬT SỰ là 1 giáo án hoàn chỉnh hay không — trước
  // đây chỉ cần văn bản có chứa chữ "giáo án" ở bất kỳ đâu là hiện banner
  // lưu kho, nên cả câu chào hỏi bình thường của AI (chỉ nhắc tới "soạn
  // giáo án" như 1 gợi ý) cũng bị nhận nhầm là giáo án đã soạn xong.
  //
  // Bug thật đã gặp (lần 2): các gợi ý nhanh KHÔNG phải giáo án đầy đủ (VD
  // "🎨 Tạo hoạt động" — chỉ gợi ý 1 hoạt động trải nghiệm, mode "chat") vẫn
  // có thể vô tình nhắc tới vài từ khoá rời rạc như "chuẩn bị", "củng cố" —
  // đủ khớp 3/7 từ khoá cũ để bị nhận NHẦM là giáo án đầy đủ. Khi cô bấm lưu,
  // extractLessonPayload() bên dưới (không có structuredData) dồn HẾT nội
  // dung vào "Hoạt động của Giáo viên" và để trống hẳn "Hoạt động của Trẻ" —
  // nhìn như giáo án bị lỗi/thiếu 1 nửa. Sửa: chỉ coi là giáo án đầy đủ khi
  // có ĐỦ CẢ HAI mục theo đúng 2 đối tượng (giáo viên VÀ trẻ) — dấu hiệu cấu
  // trúc DUY NHẤT chỉ giáo án thật (theo mẫu III. TIẾN TRÌNH HOẠT ĐỘNG SƯ
  // PHẠM ở LessonCard.tsx) mới có, còn 1 gợi ý hoạt động đơn lẻ gần như
  // không bao giờ tự nhiên tách riêng "hoạt động của cô" và "hoạt động của
  // trẻ" thành 2 mục khác nhau.
  const upperContent = content.toUpperCase();
  const hasTeacherActivitySection = /HOẠT ĐỘNG CỦA (GIÁO VIÊN|CÔ)/.test(upperContent);
  const hasChildActivitySection = /HOẠT ĐỘNG CỦA (TRẺ|BÉ|HỌC SINH)/.test(upperContent);

  const isLessonPlan =
    Boolean(structuredData) ||
    (upperContent.includes("GIÁO ÁN") && content.length > 400 && hasTeacherActivitySection && hasChildActivitySection);

  if (!isLessonPlan) return null;

  // Trích tiêu đề/lớp/thời lượng thật từ văn bản AI trả lời (best-effort).
  // KHÔNG bịa nội dung mục tiêu/chuẩn bị/hoạt động — trước đây khi AI không
  // trả về structuredData, phần này lưu vào Kho Giáo án nguyên một giáo án
  // MẪU viết cứng (chủ đề "Cây – Hoa – Quả", hoạt động "Hát múa gây hứng
  // thú"...) HOÀN TOÀN KHÔNG LIÊN QUAN tới nội dung thật AI vừa soạn — cô
  // bấm lưu tưởng lưu đúng bài vừa đọc nhưng thực ra lưu nhầm bài khác.
  // Giờ giữ nguyên toàn bộ nội dung thật vào phần "Hoạt động của Giáo viên"
  // để không mất/không bịa dữ liệu.
  // Tách best-effort đoạn văn bản NẰM GIỮA 1 mốc "bắt đầu" và mốc "kết thúc"
  // gần nhất theo sau nó (mốc "kết thúc" khác đã biết, HOẶC 1 tiêu đề mục
  // đánh số La Mã/số thường tiếp theo — dấu hiệu sang mục mới) — dùng để
  // tách riêng "Hoạt động của Giáo viên" và "Hoạt động của Trẻ" ra khỏi văn
  // bản tự do khi CẢ HAI mục đó thật sự có mặt (đã xác nhận ở isLessonPlan).
  const extractSection = (text: string, startPattern: RegExp, endPatterns: RegExp[]): string | null => {
    const startMatch = text.match(startPattern);
    if (!startMatch || startMatch.index === undefined) return null;
    const from = startMatch.index + startMatch[0].length;
    let to = text.length;
    for (const endPattern of endPatterns) {
      const rest = text.slice(from);
      const endMatch = rest.match(endPattern);
      if (endMatch && endMatch.index !== undefined) {
        to = Math.min(to, from + endMatch.index);
      }
    }
    const section = text.slice(from, to).trim();
    return section || null;
  };

  // Từ 1 đoạn văn bản, tách thành mảng gạch đầu dòng nếu có ("- ", "• ", "1.
  // ") — nếu không có gạch đầu dòng rõ ràng thì giữ nguyên cả đoạn thành 1
  // phần tử duy nhất (KHÔNG tự chia theo dấu chấm câu — dễ cắt sai giữa ý).
  const splitToBullets = (text: string): string[] => {
    const lines = text
      .split("\n")
      .map((l) => l.replace(/^[\s]*(?:[-•*]|\d+[\.\)])\s*/, "").trim())
      .filter(Boolean);
    return lines.length > 1 ? lines : [text];
  };

  const nextSectionMarker = /\n\s*(?:(?:[IVX]+|[0-9]+)[\.\)]\s*[A-ZÀ-Ỹ]{3,}|HOẠT ĐỘNG CỦA)/;

  const extractLessonPayload = () => {
    if (structuredData) return structuredData;

    const extractMatch = (pattern: RegExp, defaultVal: string) => {
      const match = content.match(pattern);
      return match ? match[1].trim() : defaultVal;
    };

    const title = extractMatch(/(?:\*\*|##)?(?:Đề tài|Chủ đề|GIÁO ÁN HOẠT ĐỘNG)[^:\n]*:\s*\*?\*?([^\n\*]+)/i, "Giáo án từ SUMFLOW Assistant");
    const ageGroup = extractMatch(/(?:\*\*|##)?Lớp[^:\n]*:\s*\*?\*?([^\n\*]+)/i, "");
    const duration = extractMatch(/(?:\*\*|##)?Thời gian[^:\n]*:\s*\*?\*?([^\n\*]+)/i, "");

    // isLessonPlan ở trên đã xác nhận văn bản có ĐỦ CẢ 2 mục "Hoạt động của
    // Giáo viên" và "Hoạt động của Trẻ" — thử tách riêng thật sự thay vì dồn
    // hết vào 1 bên như trước (khiến bên còn lại trống trơn, nhìn như lỗi).
    const teacherSection = extractSection(
      content,
      /HOẠT ĐỘNG CỦA (?:GIÁO VIÊN|CÔ)[^\n]*:?/i,
      [/HOẠT ĐỘNG CỦA (?:TRẺ|BÉ|HỌC SINH)/i, nextSectionMarker]
    );
    const childSection = extractSection(content, /HOẠT ĐỘNG CỦA (?:TRẺ|BÉ|HỌC SINH)[^\n]*:?/i, [nextSectionMarker]);

    const teacherActivities = teacherSection ? splitToBullets(teacherSection) : [content];
    // Chỉ tin childSection khi tách được nội dung THẬT (không rỗng) — tránh
    // để trống lặng lẽ nếu regex khớp mốc nhưng không có gì phía sau.
    const childActivities = childSection ? splitToBullets(childSection) : [];

    return {
      title: title.replace(/\*+/g, "").trim(),
      ageGroup: ageGroup.replace(/\*+/g, "").trim(),
      duration: duration.replace(/\*+/g, "").trim(),
      topic: "",
      objectives: JSON.stringify({
        knowledge: "(Xem đầy đủ nội dung thật ở mục Hoạt động bên dưới — SUMFLOW trả lời dạng văn bản tự do nên các mục khác chưa tách được.)",
      }),
      preparation: JSON.stringify({}),
      // Giữ NGUYÊN VĂN nội dung AI thật vừa trả lời — không bịa hoạt động khác.
      teacherActivities: JSON.stringify(teacherActivities),
      childActivities: JSON.stringify(childActivities),
      openQuestions: JSON.stringify([]),
      reinforcementGame: JSON.stringify({}),
      conclusion: "",
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
                : "💾 SUMFLOW đã soạn xong Giáo án! Cô có muốn lưu ngay vào Kho giáo án không?"}
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
