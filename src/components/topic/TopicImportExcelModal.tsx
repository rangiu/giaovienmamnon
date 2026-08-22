"use client";

import React, { useState } from "react";
import { X, Upload, FileSpreadsheet, Info } from "lucide-react";

interface TopicImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Chưa dùng — sẽ gọi khi tính năng import thật được hoàn thiện, để
  // FE cha tự refresh lại bảng đánh giá sau khi import xong.
  onImportSuccess: () => void;
}

export function TopicImportExcelModal({ isOpen, onClose }: TopicImportExcelModalProps) {
  if (!isOpen) return null;

  const [fileName, setFileName] = useState("");

  // LƯU Ý: tính năng đọc & ánh xạ dữ liệu thật từ file Excel (.xlsx/.csv)
  // vào bảng đánh giá đang được hoàn thiện, CHƯA hoạt động thật. Trước đây
  // ở đây có bảng "preview" giả với 3 tên trẻ viết cứng và nút "Xác nhận
  // Import" chỉ giả vờ chờ rồi báo thành công dù không ghi gì vào DB — đã
  // gỡ bỏ để không đánh lừa giáo viên rằng dữ liệu đã được nhập.
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    }
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

        {/* Upload chọn file — chỉ để tham khảo, KHÔNG có xử lý đọc/ghi dữ
            liệu thật phía sau (xem ghi chú trung thực bên dưới). */}
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
          {fileName && (
            <p className="text-[11px] text-slate-500">Đã chọn: <strong>{fileName}</strong></p>
          )}
        </div>

        {/* Thông báo trung thực: tính năng đọc & nhập dữ liệu thật từ file
            Excel chưa hoàn thiện — không hiển thị preview giả, không báo
            "thành công" giả như trước nữa. */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Tính năng tự động đọc & nhập dữ liệu từ file Excel vào bảng đánh giá đang được hoàn thiện,
            chưa hoạt động. Trong lúc chờ, cô vui lòng nhập/chỉnh trực tiếp từng mục tiêu trên bảng
            đánh giá theo chủ đề nhé.
          </p>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl text-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
