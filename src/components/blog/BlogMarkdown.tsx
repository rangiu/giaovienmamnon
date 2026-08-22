"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface BlogMarkdownProps {
  content: string;
}

/**
 * Hiển thị nội dung bài blog dạng Markdown — cỡ chữ/khoảng cách to hơn hẳn
 * ChatMarkdown.tsx (dùng cho bong bóng chat nhỏ), phù hợp đọc 1 bài viết dài
 * trên trang riêng. Cùng nguyên tắc an toàn: react-markdown tự escape nội
 * dung, không dùng dangerouslySetInnerHTML nên không lo XSS dù nội dung do
 * admin nhập.
 */
export function BlogMarkdown({ content }: BlogMarkdownProps) {
  return (
    <div className="prose-blog text-sm sm:text-base leading-relaxed text-slate-700 space-y-4 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          strong: ({ children }) => <strong className="font-extrabold text-slate-900">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          h1: ({ children }) => <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-8 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-7 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-6 mb-1.5">{children}</h3>,
          h4: ({ children }) => <h4 className="text-sm sm:text-base font-extrabold text-slate-900 mt-4 mb-1">{children}</h4>,
          ul: ({ children }) => <ul className="list-disc list-outside pl-5 space-y-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-outside pl-5 space-y-1.5">{children}</ol>,
          li: ({ children }) => <li className="whitespace-pre-wrap">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-emerald-300 pl-4 italic text-slate-600 bg-emerald-50/50 py-2 rounded-r-lg">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-slate-200 my-6" />,
          code: ({ children }) => (
            <code className="bg-slate-100 text-[0.9em] px-1.5 py-0.5 rounded font-mono text-slate-800">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="bg-slate-800 text-slate-100 text-xs p-4 rounded-2xl overflow-x-auto">{children}</pre>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline font-semibold">
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={alt || ""} className="w-full rounded-2xl border border-slate-100" />
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="border-collapse text-sm w-full">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left font-bold">{children}</th>,
          td: ({ children }) => <td className="border border-slate-300 px-3 py-2">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
