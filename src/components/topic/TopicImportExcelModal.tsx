"use client";

import React, { useState } from "react";
import { X, Upload, FileSpreadsheet, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";

interface TopicImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export function TopicImportExcelModal({
  isOpen,
  onClose,
  onImportSuccess,
}: TopicImportExcelModalProps) {
  if (!isOpen) return null;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);

  // Mock preview data
  const samplePreviewData = [
    { stt: 1, name: "Lý Tuấn Đạt", MT3: "+", MT6: "+", MT7: "-", MT12: "+", MT21: "+", MT33: "+", MT45: "-", MT52: "+", MT59: "+", MT66: "-" },
    { stt: 2, name: "Sùng Văn Hình", MT3: "+", MT6: "+", MT7: "+", MT12: "+", MT21: "+", MT33: "+", MT45: "+", MT52: "+", MT59: "+", MT66: "+" },
    { stt: 3, name: "Nguyễn Minh", MT3: "+", MT6: "+", MT7: "+", MT12: "+", MT21: "+", MT33: "+", MT45: "+", MT52: "+", MT59: "+", MT66: "+" },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setStep(2);
    }
  };

  const handleConfirmImport = () => {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      onImportSuccess();
      onClose();
      alert("Đã import dữ liệu đánh giá từ Excel thành công!");
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 border border-emerald-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
          <div className="flex items-center gap-2.5 text-slate-900 font-extrabold text-base">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>📥 Import Sổ Đánh Giá Trẻ Từ Excel</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Wizard Progress */}
        <div className="flex items-center justify-between text-xs font-bold bg-slate-50 p-3 rounded-2xl border border-slate-200">
          <span className={step === 1 ? "text-emerald-700 font-black" : "text-slate-400"}>
            1. Chọn file Excel
          </span>
          <ArrowRight className="w-4 h-4 text-slate-300" />
          <span className={step === 2 ? "text-emerald-700 font-black" : "text-slate-400"}>
            2. Xem trước & Map cột
          </span>
          <ArrowRight className="w-4 h-4 text-slate-300" />
          <span className={step === 3 ? "text-emerald-700 font-black" : "text-slate-400"}>
            3. Xác nhận Import
          </span>
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="border-2 border-dashed border-emerald-200 rounded-3xl p-10 text-center bg-emerald-50/30 space-y-3">
            <Upload className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">
              Kéo thả file Excel (.xlsx, .csv) hoặc bấm duyệt file
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              File bao gồm danh sách trẻ và các cột mã mục tiêu (MT3, MT6, MT7...).
            </p>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
              id="excel-file-input"
            />
            <label
              htmlFor="excel-file-input"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-5 rounded-xl shadow-sm cursor-pointer transition-colors"
            >
              <span>Chọn file từ máy tính</span>
            </label>
          </div>
        )}

        {/* Step 2: Preview & Mapping */}
        {step === 2 && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
              <span className="font-bold text-emerald-950">
                📄 File đã nạp: {fileName || "So_Danh_Gia_Truoc.xlsx"}
              </span>
              <span className="text-slate-500">Tìm thấy 12 trẻ, 10 cột mục tiêu</span>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-800">Bảng xem trước dữ liệu (Preview):</h4>
              <div className="overflow-x-auto border border-slate-200 rounded-2xl max-h-48">
                <table className="w-full text-left text-slate-700">
                  <thead className="bg-slate-100 font-bold">
                    <tr>
                      <th className="p-2 border-b">STT</th>
                      <th className="p-2 border-b">Họ và tên</th>
                      <th className="p-2 border-b">MT3</th>
                      <th className="p-2 border-b">MT6</th>
                      <th className="p-2 border-b">MT7</th>
                      <th className="p-2 border-b">MT45</th>
                    </tr>
                  </thead>
                  <tbody>
                    {samplePreviewData.map((row) => (
                      <tr key={row.stt} className="border-b">
                        <td className="p-2">{row.stt}</td>
                        <td className="p-2 font-bold">{row.name}</td>
                        <td className="p-2 text-emerald-600 font-bold">{row.MT3}</td>
                        <td className="p-2 text-emerald-600 font-bold">{row.MT6}</td>
                        <td className="p-2 font-bold">{row.MT7}</td>
                        <td className="p-2 font-bold">{row.MT45}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Quay lại
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={uploading}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{uploading ? "Đang xử lý..." : "Xác nhận Import vào hệ thống"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
