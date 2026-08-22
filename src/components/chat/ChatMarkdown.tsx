"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMarkdownProps {
  content: string;
}

/**
 * Hiển thị câu trả lời của AI dạng Markdown có định dạng thật (đậm, tiêu
 * đề, gạch đầu dòng, trích dẫn...) — trước đây tin nhắn chỉ hiện text thô
 * (`whitespace-pre-wrap`), trong khi AI luôn trả lời kèm cú pháp Markdown
 * (**đậm**, ### tiêu đề, gạch đầu dòng...) nên cô giáo thấy nguyên các ký
 * tự *, #, > thay vì chữ được định dạng đẹp — đặc biệt dễ nhận ra khi mở
 * lại lịch sử chat cũ để đọc kỹ. `react-markdown` tự động escape nội dung,
 * không dùng dangerouslySetInnerHTML nên an toàn trước XSS.
 */
export function ChatMarkdown({ content }: ChatMarkdownProps) {
  return (
    <div className="text-sm leading-relaxed font-sans space-y-2.5 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          strong: ({ children }) => <strong className="font-extrabold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          h1: ({ children }) => <h1 className="text-base font-black mt-3 mb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-black mt-3 mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-extrabold mt-2.5 mb-1">{children}</h3>,
          h4: ({ children }) => <h4 className="text-sm font-extrabold mt-2 mb-1">{children}</h4>,
          ul: ({ children }) => <ul className="list-disc list-outside pl-4 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-outside pl-4 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="whitespace-pre-wrap">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-emerald-300 pl-3 italic text-slate-600">{children}</blockquote>
          ),
          hr: () => <hr className="border-slate-200 my-2" />,
          code: ({ children }) => (
            <code className="bg-slate-200/70 text-[0.85em] px-1.5 py-0.5 rounded font-mono">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="bg-slate-800 text-slate-100 text-xs p-3 rounded-xl overflow-x-auto">{children}</pre>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline font-semibold">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="border-collapse text-xs w-full">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-slate-300 bg-slate-100 px-2 py-1 text-left font-bold">{children}</th>,
          td: ({ children }) => <td className="border border-slate-300 px-2 py-1">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
