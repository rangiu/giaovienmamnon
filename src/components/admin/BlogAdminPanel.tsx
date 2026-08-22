"use client";

import React, { useEffect, useState } from "react";
import { Newspaper, Plus, Save, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react";
import { BlogMarkdown } from "@/components/blog/BlogMarkdown";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImageUrl: string | null;
  authorName: string;
  status: string; // DRAFT | PUBLISHED
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
}

const emptyForm = { title: "", excerpt: "", content: "", coverImageUrl: "", authorName: "" };

/**
 * Quản lý bài blog cho trang giới thiệu — tạo/sửa/đăng-gỡ/xoá. Nội dung viết
 * Markdown (đậm, tiêu đề, gạch đầu dòng...) — dùng chung BlogMarkdown để
 * admin xem trước ĐÚNG NHƯ hiển thị công khai, tránh soạn xong mới biết
 * trình bày lệch.
 */
export function BlogAdminPanel() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editPreview, setEditPreview] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blog");
      const data = await res.json();
      if (data.success) setPosts(data.posts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createPost = async (e: React.FormEvent, publish: boolean) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status: publish ? "PUBLISHED" : "DRAFT" }),
      });
      const data = await res.json();
      if (data.success) {
        setForm(emptyForm);
        setShowPreview(false);
        await load();
      } else {
        alert(data.error || "Không thể tạo bài viết.");
      }
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (post: BlogPost) => {
    setEditingId(post.id);
    setEditPreview(false);
    setEditForm({
      title: post.title,
      excerpt: post.excerpt || "",
      content: post.content,
      coverImageUrl: post.coverImageUrl || "",
      authorName: post.authorName,
    });
  };

  const saveEdit = async (id: string) => {
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        await load();
      } else {
        alert(data.error || "Không thể lưu.");
      }
    } finally {
      setSavingId(null);
    }
  };

  const toggleStatus = async (post: BlogPost) => {
    setSavingId(post.id);
    try {
      await fetch(`/api/admin/blog/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: post.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" }),
      });
      await load();
    } finally {
      setSavingId(null);
    }
  };

  const removePost = async (id: string) => {
    if (!confirm("Xoá hẳn bài viết này? Không thể hoàn tác.")) return;
    setSavingId(id);
    try {
      await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
        <Newspaper className="w-4 h-4 text-emerald-600" />
        Blog — bài viết ở trang giới thiệu
      </div>

      <div className="space-y-2">
        {loading && <p className="text-xs text-slate-400 py-4 text-center">Đang tải...</p>}
        {!loading && posts.length === 0 && (
          <p className="text-xs text-slate-400 py-4 text-center">Chưa có bài viết nào — soạn bài đầu tiên bên dưới.</p>
        )}
        {posts.map((post) => (
          <div
            key={post.id}
            className={`border rounded-2xl p-3 ${post.status === "PUBLISHED" ? "border-slate-100" : "border-dashed border-slate-200 bg-slate-50/60"}`}
          >
            {editingId === post.id ? (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Tiêu đề</label>
                    <input
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Tác giả hiển thị</label>
                    <input
                      value={editForm.authorName}
                      onChange={(e) => setEditForm({ ...editForm, authorName: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Ảnh bìa (URL, để trống nếu không có)</label>
                  <input
                    value={editForm.coverImageUrl}
                    onChange={(e) => setEditForm({ ...editForm, coverImageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Tóm tắt ngắn (hiện ở danh sách)</label>
                  <input
                    value={editForm.excerpt}
                    onChange={(e) => setEditForm({ ...editForm, excerpt: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-slate-500">Nội dung (Markdown: **đậm**, ## tiêu đề, - gạch đầu dòng)</label>
                    <button
                      type="button"
                      onClick={() => setEditPreview((v) => !v)}
                      className="text-[10px] font-bold text-emerald-700 hover:underline"
                    >
                      {editPreview ? "Sửa tiếp" : "Xem trước"}
                    </button>
                  </div>
                  {editPreview ? (
                    <div className="border border-slate-200 rounded-lg p-3 max-h-72 overflow-y-auto bg-slate-50">
                      <BlogMarkdown content={editForm.content} />
                    </div>
                  ) : (
                    <textarea
                      value={editForm.content}
                      onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                      rows={10}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                    />
                  )}
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-[11px] font-bold text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-100"
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={() => saveEdit(post.id)}
                    disabled={savingId === post.id}
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
                  <p className="font-bold text-sm text-slate-900 flex items-center gap-2 flex-wrap">
                    {post.title}
                    {post.status === "PUBLISHED" ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Đã đăng</span>
                    ) : (
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">Nháp</span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {post.authorName} • {post.viewCount} lượt xem • /blog/{post.slug}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {post.status === "PUBLISHED" && (
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <button
                    onClick={() => startEdit(post)}
                    className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => toggleStatus(post)}
                    disabled={savingId === post.id}
                    className="flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {post.status === "PUBLISHED" ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {post.status === "PUBLISHED" ? "Gỡ xuống" : "Đăng bài"}
                  </button>
                  <button
                    onClick={() => removePost(post.id)}
                    disabled={savingId === post.id}
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

      <form className="pt-3 border-t border-slate-100 space-y-2">
        <p className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Soạn bài mới</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Tiêu đề</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="VD: 5 mẹo soạn giáo án nhanh hơn"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Tác giả hiển thị</label>
            <input
              value={form.authorName}
              onChange={(e) => setForm({ ...form, authorName: e.target.value })}
              placeholder="Đội ngũ SUMFLOW"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1">Ảnh bìa (URL, để trống nếu không có)</label>
          <input
            value={form.coverImageUrl}
            onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
            placeholder="https://..."
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1">Tóm tắt ngắn (hiện ở danh sách)</label>
          <input
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            placeholder="1-2 câu mô tả ngắn gọn nội dung bài"
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[10px] font-bold text-slate-500">Nội dung (Markdown: **đậm**, ## tiêu đề, - gạch đầu dòng)</label>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="text-[10px] font-bold text-emerald-700 hover:underline"
            >
              {showPreview ? "Sửa tiếp" : "Xem trước"}
            </button>
          </div>
          {showPreview ? (
            <div className="border border-slate-200 rounded-lg p-3 max-h-72 overflow-y-auto bg-slate-50">
              {form.content.trim() ? <BlogMarkdown content={form.content} /> : <p className="text-xs text-slate-400">Chưa có nội dung.</p>}
            </div>
          ) : (
            <textarea
              required
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={10}
              placeholder={"Viết nội dung bài blog ở đây, hỗ trợ Markdown:\n\n## Tiêu đề phụ\n\n**Chữ đậm**, danh sách:\n- Ý 1\n- Ý 2"}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
            />
          )}
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={(e) => createPost(e, false)}
            disabled={creating}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
          >
            <Plus className="w-3.5 h-3.5" />
            {creating ? "Đang lưu..." : "Lưu nháp"}
          </button>
          <button
            type="button"
            onClick={(e) => createPost(e, true)}
            disabled={creating}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
          >
            <Plus className="w-3.5 h-3.5" />
            {creating ? "Đang đăng..." : "Đăng bài ngay"}
          </button>
        </div>
      </form>
    </div>
  );
}
