"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  User,
  School,
  BookOpen,
  ShieldCheck,
  Save,
  Check,
  Key,
  AlertTriangle,
  Loader2,
} from "lucide-react";

export default function SettingsPage() {
  const [teacherId, setTeacherId] = useState("");
  const [userName, setUserName] = useState("Cô Nguyễn Thị Lan");
  const [schoolName, setSchoolName] = useState("Trường Mầm Non Họa Mi");
  const [className, setClassName] = useState("Lớp Mầm 1");
  const [ageGroup, setAgeGroup] = useState("4–5 tuổi");
  const [studentCount, setStudentCount] = useState(28);
  const [currentTopic, setCurrentTopic] = useState("Thế giới động vật");
  const [teachingStyle, setTeachingStyle] = useState(
    "Học qua chơi, lấy trẻ làm trung tâm, chú trọng phát triển cảm xúc"
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/teacher/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.teacher) {
          const t = data.teacher;
          setTeacherId(t.id);
          if (t.user?.name) setUserName(t.user.name);
          if (t.schoolName) setSchoolName(t.schoolName);
          if (t.className) setClassName(t.className);
          if (t.ageGroup) setAgeGroup(t.ageGroup);
          if (t.studentCount) setStudentCount(t.studentCount);
          if (t.currentTopic) setCurrentTopic(t.currentTopic);
          if (t.teachingStyle) setTeachingStyle(t.teachingStyle);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch("/api/teacher/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: teacherId,
          schoolName,
          className,
          ageGroup,
          studentCount,
          currentTopic,
          teachingStyle,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        alert(data.error || "Không thể cập nhật hồ sơ");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Cài đặt Hồ sơ Giáo viên & Hệ thống
          </h1>
          <p className="text-xs text-slate-500">
            Thông tin lớp học sẽ tự động làm ngữ cảnh hỗ trợ Cô AI đưa ra phản hồi chính xác nhất
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-3xl text-center border border-emerald-100">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 mt-2">Đang tải cài đặt...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* API Security Banner */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-5 rounded-3xl border border-emerald-200/80 flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-xs">
              <h3 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                <span>Bảo mật & Gemini API Key ở Backend</span>
                <span className="bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-md text-[10px]">
                  Bảo mật 100%
                </span>
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Gemini API Key được lưu trữ an toàn tại file <code className="bg-white px-1.5 py-0.5 rounded text-emerald-800 font-mono border border-emerald-200">.env</code> phía Backend. Frontend tuyệt đối không lưu hoặc truyền API key trên trình duyệt.
              </p>
            </div>
          </div>

          {/* Teacher Profile Form */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-emerald-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
              <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                <span>Thông tin Giáo viên & Lớp phụ trách</span>
              </h2>

              {savedSuccess && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full">
                  <Check className="w-4 h-4" />
                  <span>Đã lưu thành công!</span>
                </span>
              )}
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên giáo viên</label>
                  <input
                    type="text"
                    value={userName}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trường mầm non</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên lớp</label>
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Độ tuổi của lớp</label>
                  <select
                    value={ageGroup}
                    onChange={(e) => setAgeGroup(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="2–3 tuổi">2–3 tuổi (Nhà trẻ)</option>
                    <option value="3–4 tuổi">3–4 tuổi (Mẫu giáo bé)</option>
                    <option value="4–5 tuổi">4–5 tuổi (Mẫu giáo nhỡ)</option>
                    <option value="5–6 tuổi">5–6 tuổi (Mẫu giáo lớn)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sĩ số trẻ</label>
                  <input
                    type="number"
                    value={studentCount}
                    onChange={(e) => setStudentCount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Chủ đề giáo dục hiện tại</label>
                <input
                  type="text"
                  value={currentTopic}
                  onChange={(e) => setCurrentTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ví dụ: Thế giới động vật, Thế giới thực vật, Bản thân..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phong cách giáo án yêu thích</label>
                <textarea
                  rows={3}
                  value={teachingStyle}
                  onChange={(e) => setTeachingStyle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ví dụ: Lấy trẻ làm trung tâm, trải nghiệm trực quan, học qua chơi..."
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-6 rounded-2xl shadow-md transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Đang lưu..." : "Cập nhật hồ sơ"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
