"use client";

import React, { useState, useRef, useEffect } from "react";
import { Download, FileText, FileType, File as FileIcon } from "lucide-react";
import { exportAsTxt, exportAsDoc, exportAsPdf } from "@/lib/exportDocument";

interface ExportMenuProps {
  title: string;
  content: string;
  className?: string;
}

/** Nút "Xuất file" dùng chung — cho phép tải kết quả AI về máy dạng .txt, .doc, .pdf. */
export function ExportMenu({ title, content, className = "" }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePdf = async () => {
    setExportingPdf(true);
    try {
      await exportAsPdf(title, content);
    } finally {
      setExportingPdf(false);
      setOpen(false);
    }
  };

  return (
    <div className={`relative inline-block ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Xuất file</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 right-0 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 min-w-[150px] text-xs">
          <button
            onClick={() => {
              exportAsTxt(title, content);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left text-slate-700 font-semibold"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            Văn bản (.txt)
          </button>
          <button
            onClick={() => {
              exportAsDoc(title, content);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left text-slate-700 font-semibold"
          >
            <FileType className="w-3.5 h-3.5 text-sky-600" />
            Word (.doc)
          </button>
          <button
            onClick={handlePdf}
            disabled={exportingPdf}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left text-slate-700 font-semibold disabled:opacity-50"
          >
            <FileIcon className="w-3.5 h-3.5 text-rose-600" />
            {exportingPdf ? "Đang tạo PDF..." : "PDF (.pdf)"}
          </button>
        </div>
      )}
    </div>
  );
}
