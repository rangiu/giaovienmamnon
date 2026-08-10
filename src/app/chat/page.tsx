"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Send,
  Sparkles,
  Bot,
  User,
  BookOpen,
  Gamepad2,
  Palette,
  MessageSquare,
  FileText,
  Calendar,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  PlusCircle,
} from "lucide-react";
import { LessonCard } from "@/components/lesson/LessonCard";
import { SaveLessonBanner } from "@/components/lesson/SaveLessonBanner";

interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  structuredData?: any;
}

const QUICK_ACTIONS = [
  {
    icon: BookOpen,
    label: "📚 Soạn giáo án",
    prompt: "Soạn cho cô hoạt động khám phá quả cam cho trẻ 4–5 tuổi trong 30 phút.",
  },
  {
    icon: Gamepad2,
    label: "🎮 Tạo trò chơi",
    prompt: "Gợi ý cho cô 2 trò chơi vận động nhóm nhỏ cho trẻ 4–5 tuổi chủ đề Động vật.",
  },
  {
    icon: Palette,
    label: "🎨 Tạo hoạt động",
    prompt: "Tạo 1 hoạt động trải nghiệm xé dán sáng tạo cho trẻ 3–4 tuổi.",
  },
  {
    icon: MessageSquare,
    label: "💬 Viết cho phụ huynh",
    prompt: "Viết 1 tin nhắn phụ huynh thân thiện báo hôm nay bé An ăn ít và hơi mệt.",
  },
  {
    icon: FileText,
    label: "📝 Viết nhận xét",
    prompt: "Viết nhận xét ngắn cho bé Minh: Hôm nay bé ngoan, hăng hái trả lời bài nhưng chưa biết chia sẻ đồ chơi.",
  },
  {
    icon: Palette,
    label: "🖼️ Prompt ẢNH & VIDEO",
    prompt: "Tạo cho cô prompt ảnh 3D đất nặn học liệu bạn Khỉ con cầm quả cam cho tiết dạy mầm non.",
  },
  {
    icon: Calendar,
    label: "📅 Lập kế hoạch",
    prompt: "Lập kế hoạch hoạt động tuần về chủ đề Thế giới động vật cho lớp 4–5 tuổi.",
  },
];

function ChatContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q");

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Dạ cô ơi, em là Cô AI trợ lý của cô đây! Hôm nay cô cần em hỗ trợ làm gì ạ? Cô có thể chọn một trong các gợi ý bên dưới hoặc nói cho em biết cô cần gì nhé! 😊",
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Handle query parameter auto-send
  useEffect(() => {
    if (initialQuery && messages.length === 1) {
      handleSendMessage(initialQuery);
    }
  }, [initialQuery]);

  const handleSendMessage = async (promptToSend?: string) => {
    const text = promptToSend || inputPrompt;
    if (!text.trim() || loading) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    if (!promptToSend) setInputPrompt("");
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          conversationId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.conversationId) setConversationId(data.conversationId);

        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: data.text,
          structuredData: data.structuredData,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setErrorMsg(data.error || "Gặp sự cố kết nối với AI");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              data.text ||
              "Cô ơi, hệ thống chưa kết nối thành công với Gemini API. Cô vui lòng kiểm tra xem đã nhập GEMINI_API_KEY trong file .env chưa nhé!",
          },
        ]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Không thể gửi tin nhắn tới AI.");
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setConversationId(null);
    setMessages([
      {
        role: "assistant",
        content:
          "Dạ cô ơi, em đã khởi tạo cuộc trò chuyện mới. Cô cần em hỗ trợ nội dung nào tiếp theo ạ?",
      },
    ]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-white rounded-3xl border border-emerald-100 shadow-md overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-emerald-100 bg-emerald-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-sm md:text-base flex items-center gap-2">
              <span>Cô AI Assistant</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                Trợ lý Mầm non
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Hội thoại thông minh • Giữ ngữ cảnh nhiều lượt
            </p>
          </div>
        </div>

        <button
          onClick={handleNewChat}
          className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-white hover:bg-emerald-100/80 px-3 py-2 rounded-xl border border-emerald-200 transition-colors shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Hội thoại mới</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-3 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                <Sparkles className="w-5 h-5" />
              </div>
            )}

            <div
              className={`max-w-3xl space-y-4 ${
                msg.role === "user"
                  ? "bg-emerald-600 text-white p-4 rounded-3xl rounded-tr-sm shadow-md"
                  : "bg-slate-50 text-slate-800 p-4 md:p-5 rounded-3xl rounded-tl-sm border border-slate-200/80 shadow-sm"
              }`}
            >
              {/* Message text content */}
              <div className="text-sm whitespace-pre-wrap leading-relaxed font-sans">
                {msg.content}
              </div>

              {/* Save Lesson Confirmation Banner */}
              {msg.role === "assistant" && (
                <SaveLessonBanner
                  content={msg.content}
                  structuredData={msg.structuredData}
                />
              )}

              {/* Render Structured Lesson Card if present */}
              {msg.structuredData && (
                <div className="pt-2">
                  <LessonCard lesson={msg.structuredData} />
                </div>
              )}
            </div>

            {msg.role === "user" && (
              <div className="w-9 h-9 rounded-2xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-sm mt-1 font-bold text-xs">
                Cô
              </div>
            )}
          </div>
        ))}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex gap-3 items-center">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center animate-bounce">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="bg-slate-50 text-slate-600 px-4 py-3 rounded-2xl border border-slate-200 flex items-center gap-2 text-xs font-semibold">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Cô AI đang suy nghĩ và chuẩn bị nội dung...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Suggestions */}
      <div className="p-3 border-t border-emerald-50 bg-slate-50/50 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
            Gợi ý nhanh:
          </span>
          {QUICK_ACTIONS.map((action, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(action.prompt)}
              className="text-xs bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 px-3 py-1.5 rounded-full border border-slate-200 hover:border-emerald-300 font-semibold transition-all shadow-2xs flex items-center gap-1.5"
            >
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-emerald-100 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Nói cho Cô AI biết cô cần gì (Ví dụ: 'Thêm một trò chơi vận động không đạo cụ')..."
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-800 placeholder-slate-400 bg-slate-50/50 focus:bg-white"
          />

          <button
            type="submit"
            disabled={loading || !inputPrompt.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-5 py-3 rounded-2xl transition-colors shadow-md flex items-center gap-2 shrink-0"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            <span className="hidden sm:inline">Gửi</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Đang tải khung chat Cô AI...</div>}>
      <ChatContent />
    </Suspense>
  );
}
