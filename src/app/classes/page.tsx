"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  FileText,
  MessageSquare,
  Sparkles,
  Calendar,
  Plus,
  Loader2,
  Smile,
  X,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // New observation modal state
  const [isObsModalOpen, setIsObsModalOpen] = useState(false);
  const [obsContent, setObsContent] = useState("");
  const [obsCategory, setObsCategory] = useState("Tình cảm - Kỹ năng xã hội");
  const [addingObs, setAddingObs] = useState(false);

  // Add student modal state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentGender, setNewStudentGender] = useState("Bé trai");
  const [newStudentDob, setNewStudentDob] = useState("");
  const [newStudentNotes, setNewStudentNotes] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);

  const fetchClasses = () => {
    setLoading(true);
    fetch("/api/classes")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setClasses(data.classes);
          // Set initial selected student if none selected
          if (data.classes.length > 0 && data.classes[0].students?.length > 0) {
            setSelectedStudent((prev: any) => {
              if (prev) {
                // Refresh existing selection
                const found = data.classes[0].students.find((s: any) => s.id === prev.id);
                return found || data.classes[0].students[0];
              }
              return data.classes[0].students[0];
            });
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleAddObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !obsContent.trim()) return;
    setAddingObs(true);

    try {
      const res = await fetch(`/api/students/${selectedStudent.id}/observations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: obsContent,
          category: obsCategory,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setObsContent("");
        setIsObsModalOpen(false);
        fetchClasses(); // Refresh observations
      } else {
        alert(data.error || "Không thể thêm nhật ký quan sát");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingObs(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classes[0] || !newStudentName.trim()) return;
    setAddingStudent(true);

    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: classes[0].id,
          name: newStudentName,
          gender: newStudentGender,
          dateOfBirth: newStudentDob,
          notes: newStudentNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNewStudentName("");
        setNewStudentNotes("");
        setIsAddStudentOpen(false);
        fetchClasses();
      } else {
        alert(data.error || "Không thể thêm học sinh");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingStudent(false);
    }
  };

  const activeClass = classes[0] || null;
  const studentsList = activeClass?.students || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Quản lý Lớp học & Nhật ký Quan sát Trẻ
            </h1>
            <p className="text-xs text-slate-500">
              {activeClass?.name || "Lớp Mầm 1"} • Độ tuổi: {activeClass?.ageGroup || "4–5 tuổi"} • Sĩ số: {studentsList.length} trẻ
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddStudentOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-2xl shadow-md transition-all shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Thêm học sinh mới</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-3xl text-center border border-emerald-100">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 mt-2">Đang tải danh sách lớp học...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Student List Roster */}
          <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-900 text-sm flex items-center justify-between">
              <span>Danh sách Học sinh</span>
              <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                {studentsList.length} trẻ
              </span>
            </h2>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {studentsList.map((student: any) => {
                const isSelected = selectedStudent?.id === student.id;
                return (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={`w-full p-3.5 rounded-2xl text-left transition-all flex items-center justify-between border ${
                      isSelected
                        ? "bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-200"
                        : "bg-slate-50 hover:bg-emerald-50/60 text-slate-800 border-slate-200/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-white text-emerald-700"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm leading-tight">
                          {student.name}
                        </h3>
                        <p
                          className={`text-[11px] mt-0.5 ${
                            isSelected ? "text-emerald-100" : "text-slate-500"
                          }`}
                        >
                          {student.gender || "Bé"} • {student.dateOfBirth || "2021"}
                        </p>
                      </div>
                    </div>

                    {student.observations?.length > 0 && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {student.observations.length} ghi chú
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Student Detail & Observation Logs */}
          <div className="md:col-span-2 space-y-6">
            {selectedStudent ? (
              <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-6">
                {/* Student Info Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-emerald-50">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                      {selectedStudent.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900">
                        {selectedStudent.name}
                      </h2>
                      <p className="text-xs text-slate-500">
                        Ngày sinh: {selectedStudent.dateOfBirth || "Chưa cập nhật"} • {selectedStudent.gender}
                      </p>
                      {selectedStudent.notes && (
                        <p className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg mt-1.5 border border-emerald-100 inline-block">
                          💡 {selectedStudent.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* AI Quick Actions Triggers */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() =>
                        router.push(
                          `/tools?tab=comment&studentId=${selectedStudent.id}&name=${encodeURIComponent(
                            selectedStudent.name
                          )}`
                        )
                      }
                      className="inline-flex items-center gap-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold py-2 px-3 rounded-xl border border-sky-200 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                      <span>✨ Viết nhận xét</span>
                    </button>

                    <button
                      onClick={() =>
                        router.push(
                          `/tools?tab=parent&studentId=${selectedStudent.id}&name=${encodeURIComponent(
                            selectedStudent.name
                          )}`
                        )
                      }
                      className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold py-2 px-3 rounded-xl border border-rose-200 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-rose-600" />
                      <span>💬 Nhắn phụ huynh</span>
                    </button>
                  </div>
                </div>

                {/* Observation Log Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>Nhật ký Quan sát của {selectedStudent.name}</span>
                    </h3>

                    <button
                      onClick={() => setIsObsModalOpen(true)}
                      className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-sm transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm ghi chú mới</span>
                    </button>
                  </div>

                  {/* Observations Timeline */}
                  {selectedStudent.observations?.length > 0 ? (
                    <div className="space-y-3">
                      {selectedStudent.observations.map((obs: any) => (
                        <div
                          key={obs.id}
                          className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                              {obs.category || "Quan sát"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(obs.date).toLocaleDateString("vi-VN")}
                            </span>
                          </div>
                          <p className="text-xs text-slate-800 leading-relaxed font-medium">
                            "{obs.content}"
                          </p>
                          <p className="text-[10px] text-slate-400 text-right">
                            Ghi bởi: {obs.createdBy || "Cô Lan"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-8 rounded-2xl text-center border border-dashed border-slate-300 space-y-2">
                      <Smile className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-500">
                        Chưa có nhật ký quan sát nào cho {selectedStudent.name}. Nhấn nút 'Thêm ghi chú mới' để lưu biểu hiện của bé nhé!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center border border-emerald-100 space-y-2">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">Vui lòng chọn học sinh ở danh sách bên trái.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Observation Modal */}
      {isObsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">
                Thêm Nhật ký Quan sát cho {selectedStudent?.name}
              </h3>
              <button
                onClick={() => setIsObsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddObservation} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lĩnh vực phát triển
                </label>
                <select
                  value={obsCategory}
                  onChange={(e) => setObsCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Tình cảm - Kỹ năng xã hội">Tình cảm - Kỹ năng xã hội</option>
                  <option value="Nhận thức & Khám phá khoa học">Nhận thức & Khám phá khoa học</option>
                  <option value="Phát triển ngôn ngữ">Phát triển ngôn ngữ</option>
                  <option value="Phát triển thể chất - Vận động">Phát triển thể chất - Vận động</option>
                  <option value="Phát triển thẩm mỹ">Phát triển thẩm mỹ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nội dung quan sát thực tế
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Ví dụ: Hôm nay Minh chủ động chơi với các bạn nhưng chưa muốn chia sẻ đồ chơi..."
                  value={obsContent}
                  onChange={(e) => setObsContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsObsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={addingObs}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm"
                >
                  {addingObs ? "Đang lưu..." : "Lưu nhật ký"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">Thêm Học sinh Mới vào Lớp</h3>
              <button
                onClick={() => setIsAddStudentOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên học sinh</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Hoàng Đức Anh"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giới tính</label>
                  <select
                    value={newStudentGender}
                    onChange={(e) => setNewStudentGender(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Bé trai">Bé trai</option>
                    <option value="Bé gái">Bé gái</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày sinh</label>
                  <input
                    type="text"
                    placeholder="15/05/2021"
                    value={newStudentDob}
                    onChange={(e) => setNewStudentDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú đặc điểm</label>
                <textarea
                  rows={2}
                  placeholder="Đặc điểm sức khỏe, thói quen của trẻ..."
                  value={newStudentNotes}
                  onChange={(e) => setNewStudentNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={addingStudent}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl shadow-sm"
                >
                  {addingStudent ? "Đang thêm..." : "Thêm bé"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
