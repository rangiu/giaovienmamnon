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
  History,
  X,
  MessageCircle,
  Trash2,
  Paperclip,
} from "lucide-react";
import { LessonCard } from "@/components/lesson/LessonCard";
import { SaveLessonBanner } from "@/components/lesson/SaveLessonBanner";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { QuickActionModal, QuickActionConfig } from "@/components/chat/QuickActionModal";
import { ChatMarkdown } from "@/components/chat/ChatMarkdown";
import { TemplateQuickFormModal } from "@/components/lesson/TemplateQuickFormModal";

interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  structuredData?: any;
}

const AGE_GROUP_OPTIONS = [
  { value: "2–3 tuổi", label: "2–3 tuổi (Nhà trẻ)" },
  { value: "3–4 tuổi", label: "3–4 tuổi (Mẫu giáo bé)" },
  { value: "4–5 tuổi", label: "4–5 tuổi (Mẫu giáo nhỡ)" },
  { value: "5–6 tuổi", label: "5–6 tuổi (Mẫu giáo lớn)" },
];

// Mỗi mục "Gợi ý nhanh" giờ mở 1 form nhập thông tin THẬT trước khi gọi AI,
// thay vì bắn ngay 1 câu prompt mẫu viết cứng không liên quan tới lớp/trẻ
// thật của cô (VD: bé "Minh"/"An" không có thật, chủ đề "quả cam" cố định).
const QUICK_ACTIONS: (QuickActionConfig & { icon: any; shortLabel: string; mode: "lesson" | "parent" | "comment" | "media" | "chat" })[] = [
  {
    id: "lesson",
    icon: BookOpen,
    shortLabel: "📚 Soạn giáo án",
    title: "Soạn giáo án",
    description: "AI soạn giáo án đầy đủ theo đúng chủ đề, độ tuổi, thời lượng thật của lớp cô.",
    mode: "lesson",
    fields: [
      { key: "topic", label: "Chủ đề / hoạt động cần soạn", type: "text", required: true, placeholder: "Ví dụ: Khám phá quả cam" },
      { key: "ageGroup", label: "Độ tuổi", type: "select", options: AGE_GROUP_OPTIONS, defaultValue: "4–5 tuổi" },
      {
        key: "duration",
        label: "Thời lượng",
        type: "select",
        defaultValue: "30 phút",
        options: [
          { value: "20 phút", label: "20 phút" },
          { value: "30 phút", label: "30 phút" },
          { value: "35 phút", label: "35 phút" },
          { value: "45 phút", label: "45 phút" },
        ],
      },
    ],
  },
  {
    id: "game",
    icon: Gamepad2,
    shortLabel: "🎮 Tạo trò chơi",
    title: "Tạo trò chơi",
    description: "AI gợi ý trò chơi phù hợp đúng chủ đề, độ tuổi cô đang dạy.",
    mode: "chat",
    fields: [
      { key: "topic", label: "Chủ đề trò chơi", type: "text", required: true, placeholder: "Ví dụ: Thế giới động vật" },
      { key: "ageGroup", label: "Độ tuổi", type: "select", options: AGE_GROUP_OPTIONS, defaultValue: "4–5 tuổi" },
      {
        key: "groupType",
        label: "Hình thức chơi",
        type: "select",
        defaultValue: "Nhóm nhỏ",
        options: [
          { value: "Nhóm nhỏ", label: "Nhóm nhỏ" },
          { value: "Cả lớp", label: "Cả lớp" },
          { value: "Cá nhân", label: "Cá nhân" },
        ],
      },
    ],
  },
  {
    id: "activity",
    icon: Palette,
    shortLabel: "🎨 Tạo hoạt động",
    title: "Tạo hoạt động trải nghiệm",
    description: "AI gợi ý hoạt động trải nghiệm/sáng tạo phù hợp với lớp cô.",
    mode: "chat",
    fields: [
      { key: "topic", label: "Chủ đề / loại hoạt động", type: "text", required: true, placeholder: "Ví dụ: Xé dán sáng tạo con vật" },
      { key: "ageGroup", label: "Độ tuổi", type: "select", options: AGE_GROUP_OPTIONS, defaultValue: "4–5 tuổi" },
    ],
  },
  {
    id: "parent",
    icon: MessageSquare,
    shortLabel: "💬 Viết cho phụ huynh",
    title: "Viết tin nhắn cho phụ huynh",
    description: "AI viết tin nhắn Zalo/SMS đúng tên bé và tình huống thật hôm nay.",
    mode: "parent",
    fields: [
      { key: "studentName", label: "Tên bé", type: "text", required: true, placeholder: "Ví dụ: bé Nguyễn Minh" },
      { key: "input", label: "Tình hình cần báo phụ huynh", type: "textarea", required: true, placeholder: "Ví dụ: Hôm nay bé ăn ít và hơi mệt" },
      {
        key: "tone",
        label: "Văn phong",
        type: "select",
        defaultValue: "friendly",
        options: [
          { value: "friendly", label: "🌱 Thân thiện, ấm áp" },
          { value: "polite", label: "🌸 Lịch sự, chu đáo" },
          { value: "brief", label: "⚡ Ngắn gọn, súc tích" },
          { value: "formal", label: "📜 Trang trọng" },
        ],
      },
    ],
  },
  {
    id: "comment",
    icon: FileText,
    shortLabel: "📝 Viết nhận xét",
    title: "Viết nhận xét trẻ",
    description: "AI viết nhận xét ấm áp từ đúng ghi chú quan sát thật của bé.",
    mode: "comment",
    fields: [
      { key: "studentName", label: "Tên bé", type: "text", required: true, placeholder: "Ví dụ: bé Nguyễn Minh" },
      { key: "input", label: "Ghi chú / biểu hiện quan sát thật", type: "textarea", required: true, placeholder: "Ví dụ: Hôm nay bé ngoan, hăng hái trả lời bài nhưng chưa biết chia sẻ đồ chơi" },
    ],
  },
  {
    id: "media",
    icon: Palette,
    shortLabel: "🖼️ Prompt ẢNH & VIDEO",
    title: "Tạo Prompt Ảnh & Video",
    description: "AI tạo prompt tiếng Anh + mô tả tiếng Việt đúng ý tưởng thật của cô.",
    mode: "media",
    fields: [
      { key: "input", label: "Ý tưởng hình ảnh / video học liệu", type: "textarea", required: true, placeholder: "Ví dụ: Quả cam tươi mọng nước trên đĩa nhựa học tập" },
      {
        key: "mediaType",
        label: "Loại học liệu",
        type: "select",
        defaultValue: "image",
        options: [
          { value: "image", label: "🖼️ Hình ảnh" },
          { value: "video", label: "🎬 Video ngắn" },
        ],
      },
      {
        key: "artStyle",
        label: "Phong cách",
        type: "select",
        defaultValue: "3d_clay",
        // Danh sách này PHẢI khớp với select "Phong cách nghệ thuật" ở
        // trang Công cụ AI Nhanh (tools/page.tsx) và ART_STYLE_MAP trong
        // aiEngine.ts — trước đây 2 nơi lệch nhau (thiếu "tranh tô màu" ở
        // đây, mã "flat_cartoon"/"flat_vector" gọi 2 tên khác nhau).
        options: [
          { value: "3d_clay", label: "🎨 Đất nặn 3D dễ thương" },
          { value: "3d_cute", label: "🧸 Hoạt hình 3D ngộ nghĩnh" },
          { value: "watercolor", label: "🖌️ Màu nước mộng mơ" },
          { value: "coloring_book", label: "✏️ Tranh tô màu (đen trắng)" },
          { value: "flat_cartoon", label: "⭐ Hoạt hình phẳng (Flashcard)" },
        ],
      },
    ],
  },
  {
    id: "plan",
    icon: Calendar,
    shortLabel: "📅 Lập kế hoạch",
    title: "Lập kế hoạch hoạt động",
    description: "AI lập kế hoạch theo đúng chủ đề, độ tuổi, khoảng thời gian cô cần.",
    mode: "chat",
    fields: [
      { key: "topic", label: "Chủ đề", type: "text", required: true, placeholder: "Ví dụ: Thế giới động vật" },
      { key: "ageGroup", label: "Độ tuổi", type: "select", options: AGE_GROUP_OPTIONS, defaultValue: "4–5 tuổi" },
      {
        key: "span",
        label: "Khoảng thời gian",
        type: "select",
        defaultValue: "1 tuần",
        options: [
          { value: "1 tuần", label: "1 tuần" },
          { value: "2 tuần", label: "2 tuần" },
          { value: "1 tháng", label: "1 tháng" },
        ],
      },
    ],
  },
];

function ChatContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q");

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Dạ cô ơi, em là SUMFLOW trợ lý của cô đây! Hôm nay cô cần em hỗ trợ làm gì ạ? Cô có thể chọn một trong các gợi ý bên dưới hoặc nói cho em biết cô cần gì nhé! 😊",
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Lịch sử hội thoại — Backend đã lưu đủ (Conversation + Message) từ trước,
  // nhưng FE chưa từng gọi GET /api/chat để hiển thị lại, nên mỗi lần vào
  // trang là mất sạch lịch sử dù dữ liệu vẫn còn trong database.
  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Quick Action: mở form nhập thông tin thật trước khi gọi AI
  const [activeQuickAction, setActiveQuickAction] = useState<(typeof QUICK_ACTIONS)[number] | null>(null);
  const [submittingQuickAction, setSubmittingQuickAction] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const fetchConversations = () => {
    setLoadingHistory(true);
    fetch("/api/chat")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setConversations(data.conversations || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleOpenConversation = (conv: any) => {
    setConversationId(conv.id);
    setMessages(
      conv.messages.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        structuredData: m.structuredData ? JSON.parse(m.structuredData) : undefined,
      }))
    );
    setShowHistory(false);
  };

  // Handle query parameter auto-send
  useEffect(() => {
    if (initialQuery && messages.length === 1) {
      handleSendMessage(initialQuery);
    }
  }, [initialQuery]);

  // File đính kèm & Paste (Ctrl+V) ở ô Chat
  const [attachedFile, setAttachedFile] = useState<{ fileName: string; text: string } | null>(null);
  const [parsingFile, setParsingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    setParsingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/chat/parse-file", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.text) {
        setAttachedFile({ fileName: file.name, text: data.text });
      } else {
        alert(data.error || "Không thể đọc file đính kèm.");
      }
    } catch (err) {
      console.error("Parse chat file error:", err);
      alert("Lỗi khi đính kèm file.");
    } finally {
      setParsingFile(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const files = e.clipboardData?.files;
    if (files && files.length > 0) {
      e.preventDefault();
      handleFileProcess(files[0]);
    }
  };

  const handleSendMessage = async (promptToSend?: string) => {
    const text = promptToSend || inputPrompt;
    if (!text.trim() || loading) return;

    let fullPromptToSend = text;
    if (attachedFile) {
      fullPromptToSend = `${text}\n\n[TÀI LIỆU ĐÍNH KÈM TỪ FILE: "${attachedFile.fileName}"]:\n${attachedFile.text.slice(0, 10000)}`;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: attachedFile ? `📄 [File: ${attachedFile.fileName}]\n${text}` : text,
    };
    setMessages((prev) => [...prev, userMessage]);
    if (!promptToSend) setInputPrompt("");
    setAttachedFile(null);
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: fullPromptToSend,
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
        fetchConversations();
      } else {
        setErrorMsg(data.error || "Gặp sự cố kết nối với AI");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              // Ưu tiên hiện đúng lý do thật (VD: hết lượt chat miễn phí hôm
              // nay) thay vì luôn đổ lỗi cho việc thiếu cấu hình Gemini key.
              data.error ||
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

  // Xử lý khi cô điền xong form Quick Action và bấm "Gửi cho SUMFLOW".
  // - mode "chat": ghép các trường thật thành 1 câu prompt rồi gửi qua
  //   /api/chat như bình thường (được lưu vào lịch sử hội thoại).
  // - mode "lesson"/"parent"/"comment"/"media": gọi thẳng API AI chuyên
  //   dụng tương ứng (đáng tin cậy hơn, đặc biệt giáo án luôn ra đúng cấu
  //   trúc để lưu kho) rồi tự thêm cặp tin nhắn hỏi/đáp vào khung chat.
  const handleQuickActionSubmit = async (values: Record<string, string>) => {
    const action = activeQuickAction;
    if (!action) return;

    if (action.mode === "chat") {
      let prompt = "";
      if (action.id === "game") {
        prompt = `Gợi ý cho cô 2 trò chơi phù hợp cho trẻ ${values.ageGroup}, chủ đề "${values.topic}", hình thức chơi: ${values.groupType}.`;
      } else if (action.id === "activity") {
        prompt = `Tạo cho cô 1 hoạt động trải nghiệm/sáng tạo cho trẻ ${values.ageGroup} với chủ đề: ${values.topic}.`;
      } else if (action.id === "plan") {
        prompt = `Lập kế hoạch hoạt động ${values.span} cho lớp ${values.ageGroup} với chủ đề: ${values.topic}.`;
      }
      setActiveQuickAction(null);
      handleSendMessage(prompt);
      return;
    }

    setSubmittingQuickAction(true);
    try {
      if (action.mode === "lesson") {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: `Soạn giáo án: "${values.topic}" — ${values.ageGroup}, ${values.duration}` },
        ]);
        const res = await fetch("/api/lessons/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: values.topic, ageGroup: values.ageGroup, duration: values.duration }),
        });
        const data = await res.json();
        if (data.success && data.lesson) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `✅ SUMFLOW đã soạn xong giáo án "${data.lesson.title}". Cô xem chi tiết bên dưới nhé!`,
              structuredData: data.lesson,
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.message || data.error || "Cô ơi, AI chưa soạn được giáo án lúc này, cô thử lại nhé." },
          ]);
        }
      } else if (action.mode === "parent") {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: `Viết tin nhắn phụ huynh cho ${values.studentName}: ${values.input}` },
        ]);
        const res = await fetch("/api/ai/parent-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: values.input, studentName: values.studentName, tone: values.tone }),
        });
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message || data.error || "Cô ơi, AI chưa tạo được tin nhắn lúc này, cô thử lại nhé." },
        ]);
      } else if (action.mode === "comment") {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: `Viết nhận xét cho ${values.studentName}: ${values.input}` },
        ]);
        const res = await fetch("/api/ai/comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: values.input, studentName: values.studentName }),
        });
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.comment || data.error || "Cô ơi, AI chưa viết được nhận xét lúc này, cô thử lại nhé." },
        ]);
      } else if (action.mode === "media") {
        setMessages((prev) => [...prev, { role: "user", content: `Tạo prompt ảnh/video: ${values.input}` }]);
        const res = await fetch("/api/ai/media-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: values.input, mediaType: values.mediaType, artStyle: values.artStyle }),
        });
        const data = await res.json();
        if (data.success) {
          const combined = `🖼️ Prompt tiếng Anh:\n${data.englishPrompt}\n\n📝 Mô tả tiếng Việt:\n${data.vietnameseDesc}\n\n💡 Gợi ý sử dụng:\n${data.usageTip}`;
          setMessages((prev) => [...prev, { role: "assistant", content: combined }]);
        } else {
          setMessages((prev) => [...prev, { role: "assistant", content: data.error || "Cô ơi, AI chưa tạo được prompt lúc này, cô thử lại nhé." }]);
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "assistant", content: "Cô ơi, có lỗi kết nối, cô thử lại nhé." }]);
    } finally {
      setSubmittingQuickAction(false);
      setActiveQuickAction(null);
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

  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation(); // không mở cuộc trò chuyện khi bấm nút xoá
    if (!confirm("Cô có chắc muốn xoá cuộc trò chuyện này không? Không thể khôi phục lại được.")) return;

    setDeletingConversationId(convId);
    try {
      const res = await fetch(`/api/chat/${convId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        // Nếu đang xem đúng cuộc trò chuyện vừa xoá, quay về màn hội thoại mới.
        if (convId === conversationId) handleNewChat();
      } else {
        alert(data.error || "Không thể xoá cuộc trò chuyện.");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối khi xoá cuộc trò chuyện.");
    } finally {
      setDeletingConversationId(null);
    }
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
              <span>SUMFLOW Assistant</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                Trợ lý Mầm non
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Hội thoại thông minh • Giữ ngữ cảnh nhiều lượt
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-white hover:bg-emerald-100/80 px-3 py-2 rounded-xl border border-emerald-200 transition-colors shadow-sm"
          >
            <History className="w-4 h-4" />
            <span>Lịch sử hội thoại</span>
            {conversations.length > 0 && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded-full font-black">
                {conversations.length}
              </span>
            )}
          </button>

          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-white hover:bg-emerald-100/80 px-3 py-2 rounded-xl border border-emerald-200 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Hội thoại mới</span>
          </button>
        </div>
      </div>

      {/* Lịch sử hội thoại — slide-down panel, dữ liệu thật từ database */}
      {showHistory && (
        <div className="border-b border-emerald-100 bg-slate-50/70 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Các cuộc trò chuyện trước
              </span>
              <p className="text-[10px] text-slate-400">Chỉ lưu tối đa 10 cuộc gần nhất — cũ hơn sẽ tự động xoá.</p>
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="w-6 h-6 rounded-full hover:bg-slate-200 text-slate-400 flex items-center justify-center shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {loadingHistory ? (
            <div className="text-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600 mx-auto" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              Chưa có cuộc trò chuyện nào được lưu lại.
            </p>
          ) : (
            <div className="px-3 pb-3 space-y-1.5">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`w-full flex items-center gap-2.5 rounded-xl transition-colors ${
                    conv.id === conversationId
                      ? "bg-emerald-100 border border-emerald-300"
                      : "bg-white hover:bg-emerald-50 border border-slate-200"
                  }`}
                >
                  <button
                    onClick={() => handleOpenConversation(conv)}
                    className="flex-1 min-w-0 flex items-center gap-2.5 text-left px-3 py-2.5"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{conv.title}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(conv.updatedAt).toLocaleString("vi-VN")} • {conv.messages.length} tin nhắn
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    disabled={deletingConversationId === conv.id}
                    title="Xoá cuộc trò chuyện này"
                    className="shrink-0 w-8 h-8 mr-1.5 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                  >
                    {deletingConversationId === conv.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
              {/* Message text content — trả lời của AI hiển thị Markdown có
                  định dạng thật (đậm, tiêu đề, gạch đầu dòng...); tin nhắn
                  cô gõ giữ nguyên dạng văn bản thô đơn giản. */}
              {msg.role === "assistant" ? (
                <ChatMarkdown content={msg.content} />
              ) : (
                <div className="text-sm whitespace-pre-wrap leading-relaxed font-sans">{msg.content}</div>
              )}

              {/* Xuất câu trả lời của AI ra file txt/doc/pdf */}
              {msg.role === "assistant" && msg.content && (
                <div className="pt-1">
                  <ExportMenu title="SUMFLOW - Kết quả trả lời" content={msg.content} />
                </div>
              )}

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
              <span>SUMFLOW đang suy nghĩ và chuẩn bị nội dung...</span>
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
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-full font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>📋 Soạn Theo Mẫu Word</span>
          </button>

          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => setActiveQuickAction(action)}
              className="text-xs bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 px-3 py-1.5 rounded-full border border-slate-200 hover:border-emerald-300 font-semibold transition-all shadow-2xs flex items-center gap-1.5"
            >
              <span>{action.shortLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-emerald-100 bg-white space-y-2">
        {/* Attached File Badge */}
        {attachedFile && (
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800">
            <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
            <span>📄 {attachedFile.fileName}</span>
            <span className="text-[10px] text-emerald-600 font-normal">
              ({attachedFile.text.length} ký tự text)
            </span>
            <button
              onClick={() => setAttachedFile(null)}
              className="w-4 h-4 rounded-full bg-emerald-200 hover:bg-emerald-300 text-emerald-800 flex items-center justify-center font-bold text-[10px] ml-1"
              title="Xóa file đính kèm"
            >
              ✕
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Paperclip File Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={parsingFile || loading}
            title="Đính kèm file Word (.docx, .doc), PDF, TXT, MD hoặc Dán (Ctrl+V)"
            className="p-3 rounded-2xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors shrink-0 disabled:opacity-50"
          >
            {parsingFile ? (
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.pdf,.txt,.md,.doc"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileProcess(file);
              e.target.value = "";
            }}
          />

          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onPaste={handlePaste}
            placeholder="Nói cho SUMFLOW biết cô cần gì (Cô có thể dán file Ctrl+V hoặc bấm 📎 đính kèm)..."
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-800 placeholder-slate-400 bg-slate-50/50 focus:bg-white"
          />

          <button
            type="submit"
            disabled={loading || parsingFile || (!inputPrompt.trim() && !attachedFile)}
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

      <QuickActionModal
        config={activeQuickAction}
        onClose={() => setActiveQuickAction(null)}
        onSubmit={handleQuickActionSubmit}
        submitting={submittingQuickAction}
      />

      <TemplateQuickFormModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onLessonGenerated={(newLesson) => {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `✅ SUMFLOW đã soạn xong giáo án "${newLesson.title}" theo mẫu cô chọn! Cô xem chi tiết bên dưới nhé!`,
              structuredData: newLesson,
            },
          ]);
        }}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Đang tải khung chat SUMFLOW...</div>}>
      <ChatContent />
    </Suspense>
  );
}
