"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, UserCheck, Heart, ShieldCheck } from "lucide-react";

export function Navbar() {
  const [teacher, setTeacher] = useState<any>(null);

  useEffect(() => {
    fetch("/api/teacher/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.teacher) {
          setTeacher(data.teacher);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className="h-16 bg-white border-b border-emerald-100/80 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-3 md:hidden">
        <div className="w-9 h-9 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-200">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <span className="font-bold text-lg text-emerald-900">Cô AI</span>
      </div>

      <div className="hidden md:flex items-center gap-2 text-sm text-slate-600 bg-emerald-50/60 px-3 py-1.5 rounded-full border border-emerald-100">
        <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
        <span>Đồng hành cùng Giáo viên Mầm non Việt Nam</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 text-xs bg-amber-50 text-amber-800 px-3 py-1.5 rounded-full border border-amber-200">
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          <span>{teacher?.className || "Lớp Mầm 1"} • {teacher?.ageGroup || "4–5 tuổi"}</span>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 transition-colors p-1.5 pr-3 rounded-full border border-emerald-200 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shadow-inner">
            Lan
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-bold text-emerald-950 leading-tight">
              {teacher?.user?.name || "Cô Lan"}
            </p>
            <p className="text-[10px] text-emerald-700">
              {teacher?.schoolName || "Mầm Non Họa Mi"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
