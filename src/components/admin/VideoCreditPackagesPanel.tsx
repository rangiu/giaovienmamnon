"use client";

import React, { useEffect, useState } from "react";
import { Video, Plus, Save, Trash2, Eye, EyeOff } from "lucide-react";

interface VideoCreditPackage {
  id: string;
  name: string;
  tier: string; // HYBRID | VEO
  credits: number;
  priceVnd: number;
  isActive: boolean;
  orderIndex: number;
}

const TIER_LABEL: Record<string, string> = {
  HYBRID: "Hybrid (ảnh AI + hoạt hình)",
  VEO: "Veo (chuyển động thật)",
};

const emptyForm = { name: "", tier: "HYBRID", credits: 10, priceVnd: 50000, orderIndex: 0 };

export function VideoCreditPackagesPanel() {
  const [packages, setPackages] = useState<VideoCreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/video-packages");
      const data = await res.json();
      if (data.success) setPackages(data.packages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/video-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setForm(emptyForm);
        await load();
      }
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (pkg: VideoCreditPackage) => {
    setEditingId(pkg.id);
    setEditForm({ name: pkg.name, tier: pkg.tier, credits: pkg.credits, priceVnd: pkg.priceVnd, orderIndex: pkg.orderIndex });
  };

  const saveEdit = async (id: string) => {
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/video-packages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        await load();
      }
    } finally {
      setSavingId(null);
    }
  };

  const toggleActive = async (pkg: VideoCreditPackage) => {
    setSavingId(pkg.id);
    try {
      await fetch(`/api/admin/video-packages/${pkg.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !pkg.isActive }),
      });
      await load();
    } finally {
      setSavingId(null);
    }
  };

  const removePackage = async (id: string) => {
    if (!confirm("Xoá hẳn gói tín dụng này? (Nếu gói đã có người mua, nên dùng nút ẩn/hiện thay vì xoá)")) return;
    setSavingId(id);
    try {
      await fetch(`/api/admin/video-packages/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
        <Video className="w-4 h-4 text-emerald-600" />
        Gói tín dụng tạo video (bán riêng, tách khỏi gói thuê bao)
      </div>

      <div className="space-y-2">
        {loading && <p className="text-xs text-slate-400 py-4 text-center">Đang tải...</p>}
        {!loading && packages.length === 0 && (
          <p className="text-xs text-slate-400 py-4 text-center">Chưa có gói tín dụng nào — thêm gói đầu tiên bên dưới.</p>
        )}
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`border rounded-2xl p-3 ${pkg.isActive ? "border-slate-100" : "border-slate-100 bg-slate-50/60 opacity-70"}`}
          >
            {editingId === pkg.id ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Tên gói</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Tier</label>
                  <select
                    value={editForm.tier}
                    onChange={(e) => setEditForm({ ...editForm, tier: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                  >
                    <option value="HYBRID">HYBRID</option>
                    <option value="VEO">VEO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Số token</label>
                  <input
                    type="number"
                    value={editForm.credits}
                    onChange={(e) => setEditForm({ ...editForm, credits: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Giá (VNĐ)</label>
                  <input
                    type="number"
                    value={editForm.priceVnd}
                    onChange={(e) => setEditForm({ ...editForm, priceVnd: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div className="col-span-2 sm:col-span-5 flex gap-2 justify-end pt-1">
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-[11px] font-bold text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-100"
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={() => saveEdit(pkg.id)}
                    disabled={savingId === pkg.id}
                    className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg disabled:opacity-60"
                  >
                    <Save className="w-3 h-3" />
                    Lưu
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    {pkg.name}
                    {!pkg.isActive && <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">Đã ẩn</span>}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {TIER_LABEL[pkg.tier] || pkg.tier} • {pkg.credits} token • {pkg.priceVnd.toLocaleString("vi-VN")}đ
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => startEdit(pkg)}
                    className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => toggleActive(pkg)}
                    disabled={savingId === pkg.id}
                    className="flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {pkg.isActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {pkg.isActive ? "Ẩn" : "Hiện"}
                  </button>
                  <button
                    onClick={() => removePackage(pkg.id)}
                    disabled={savingId === pkg.id}
                    className="flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={createPackage} className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-slate-500 mb-1">Tên gói mới</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="VD: 10 token Hybrid"
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1">Tier</label>
          <select
            value={form.tier}
            onChange={(e) => setForm({ ...form, tier: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
          >
            <option value="HYBRID">HYBRID</option>
            <option value="VEO">VEO</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1">Số token</label>
          <input
            type="number"
            min={1}
            value={form.credits}
            onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1">Giá (VNĐ)</label>
          <input
            type="number"
            min={0}
            value={form.priceVnd}
            onChange={(e) => setForm({ ...form, priceVnd: Number(e.target.value) })}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
          />
        </div>
        <div className="col-span-2 sm:col-span-5">
          <button
            type="submit"
            disabled={creating}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
          >
            <Plus className="w-3.5 h-3.5" />
            {creating ? "Đang thêm..." : "Thêm gói"}
          </button>
        </div>
      </form>
    </div>
  );
}
