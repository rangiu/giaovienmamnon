"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  AlertCircle,
  MessageCircle,
  Facebook,
  HardDriveDownload,
  Check,
} from "lucide-react";

interface Props {
  userName: string;
  currentStatus: string;
  currentPeriodEnd: string | null;
  accessAllowed: boolean;
}

interface Plan {
  code: string;
  label: string;
  durationDays: number;
  priceVnd: number;
}

/** POST form ẩn sang trang thanh toán do SePay host — giống hệt cách dự án
 * tham khảo đã chạy được thật (SDK sepay-pg-node), không tự vẽ QR nữa. */
function redirectToSepayCheckout(checkoutUrl: string, fields: Record<string, string | number>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkoutUrl;
  Object.entries(fields).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = String(value);
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

function BillingContent({ userName, currentStatus, currentPeriodEnd, accessAllowed }: Props) {
  const searchParams = useSearchParams();
  const returnCode = searchParams.get("code");
  const returnResult = searchParams.get("result");

  const [plans, setPlans] = useState<Plan[]>([]);
  const [offlinePriceVnd, setOfflinePriceVnd] = useState<number | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string>("MONTHLY");

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/billing/plans")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPlans(data.plans || []);
          setOfflinePriceVnd(data.offlinePriceVnd ?? null);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingPlans(false));
  }, []);

  const createPayment = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode: selectedPlan }),
      });
      const data = await res.json();
      if (data.success && data.checkoutUrl && data.fields) {
        redirectToSepayCheckout(data.checkoutUrl, data.fields);
        // Trình duyệt sẽ điều hướng đi ngay sau submit — không cần setCreating(false).
      } else {
        setError(data.error || "Không thể tạo yêu cầu thanh toán.");
        setCreating(false);
      }
    } catch {
      setError("Không thể kết nối tới máy chủ.");
      setCreating(false);
    }
  };

  // Sau khi SePay chuyển hướng khách quay lại (?code=...&result=...), tự
  // poll trạng thái thật từ webhook — return URL chỉ mang tính thông báo,
  // webhook IPN mới là nguồn xác nhận chính xác cuối cùng.
  useEffect(() => {
    if (!returnCode) return;
    setPolling(true);

    const checkStatus = async () => {
      const res = await fetch(`/api/payment/status/${returnCode}`);
      const data = await res.json();
      if (data.success && data.status === "PAID") {
        setPaid(true);
        setPolling(false);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    };

    checkStatus();
    pollRef.current = setInterval(checkStatus, 3000);

    // Dừng poll sau 2 phút để không chờ vô hạn nếu có sự cố.
    const stopTimeout = setTimeout(() => {
      if (pollRef.current) clearInterval(pollRef.current);
      setPolling(false);
    }, 120000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      clearTimeout(stopTimeout);
    };
  }, [returnCode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 px-4 py-8">
      <div className="max-w-md mx-auto space-y-5">
        {accessAllowed && (
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700">
            <ArrowLeft className="w-3.5 h-3.5" />
            Về trang chủ
          </Link>
        )}

        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-100 flex items-center justify-center shadow-lg shadow-emerald-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="SUMFLOW" className="w-9 h-9 object-contain" />
          </div>
          <h1 className="text-xl font-black text-slate-900">Gói sử dụng & Thanh toán</h1>
          <p className="text-xs text-slate-500">Xin chào {userName}</p>
        </div>

        <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Trạng thái hiện tại</span>
            <span className="font-bold text-slate-900">{currentStatus}</span>
          </div>
          {currentPeriodEnd && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Hết hạn</span>
              <span className="font-bold text-slate-900">{new Date(currentPeriodEnd).toLocaleDateString("vi-VN")}</span>
            </div>
          )}

          {paid ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              <p className="font-bold text-slate-900">Thanh toán thành công!</p>
              <p className="text-xs text-slate-500">Gói sử dụng của cô đã được gia hạn.</p>
              <Link
                href="/"
                className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 px-6 rounded-xl transition-colors"
              >
                Vào sử dụng ngay
              </Link>
            </div>
          ) : polling ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-sm font-bold text-slate-800">Đang xác nhận thanh toán...</p>
              <p className="text-xs text-slate-500">
                {returnResult === "cancel"
                  ? "Nếu cô đã huỷ giao dịch, có thể bấm nút bên dưới để thử lại."
                  : "Vui lòng đợi trong giây lát, hệ thống đang đối soát với SePay."}
              </p>
              <button
                onClick={createPayment}
                disabled={creating}
                className="mt-2 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 px-6 rounded-xl transition-colors disabled:opacity-60"
              >
                <CreditCard className="w-4 h-4" />
                {creating ? "Đang chuyển hướng..." : "Thanh toán lại"}
              </button>
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs font-bold text-slate-700 mb-2">Chọn gói thuê bao</p>
                {loadingPlans ? (
                  <div className="py-6 text-center">
                    <Loader2 className="w-5 h-5 text-emerald-600 animate-spin mx-auto" />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {plans.map((plan) => {
                      const isSelected = selectedPlan === plan.code;
                      return (
                        <button
                          key={plan.code}
                          type="button"
                          onClick={() => setSelectedPlan(plan.code)}
                          className={`relative p-3 rounded-2xl border text-center transition-all ${
                            isSelected
                              ? "bg-emerald-600 border-emerald-600 text-white shadow-md"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-300"
                          }`}
                        >
                          {isSelected && (
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                          <p className="text-[11px] font-bold">{plan.label}</p>
                          <p className={`text-xs font-black mt-1 ${isSelected ? "text-white" : "text-emerald-700"}`}>
                            {plan.priceVnd.toLocaleString("vi-VN")}đ
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={createPayment}
                disabled={creating || loadingPlans}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-3 rounded-xl shadow-sm transition-colors disabled:opacity-60"
              >
                <CreditCard className="w-4 h-4" />
                {creating ? "Đang chuyển hướng..." : "Thanh toán / Gia hạn ngay"}
              </button>
            </>
          )}

          {error && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </p>
          )}

          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            Bấm "Thanh toán / Gia hạn ngay" sẽ chuyển sang trang thanh toán an toàn của SePay.
          </p>
        </div>

        {/* Gói tải bản offline vĩnh viễn — bán/giao thủ công qua FB/Zalo,
            KHÔNG qua cổng thanh toán tự động (cần tư vấn, cài đặt riêng
            trên máy khách hàng). */}
        <div className="bg-white rounded-3xl border border-amber-200 shadow-sm p-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <HardDriveDownload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Gói tải bản Offline vĩnh viễn</h3>
              <p className="text-[11px] text-slate-500">Cài đặt & chỉnh sửa trực tiếp trên máy của cô</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Mua đứt trọn đời, không cần internet để dùng, cài trên máy tính cá nhân/trường, có thể yêu cầu
            tuỳ chỉnh riêng theo nhu cầu.
            {offlinePriceVnd !== null && (
              <>
                {" "}
                Giá tham khảo từ <strong className="text-amber-700">{offlinePriceVnd.toLocaleString("vi-VN")}đ</strong>.
              </>
            )}{" "}
            Liên hệ trực tiếp để được tư vấn & báo giá chính xác:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <a
              href="https://www.facebook.com/share/17phzLgVWC/?mibextid=wwXIfr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold py-2.5 rounded-xl border border-blue-200 transition-colors"
            >
              <Facebook className="w-4 h-4" />
              Facebook
            </a>
            <a
              href="https://zalo.me/0899442256"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold py-2.5 rounded-xl border border-sky-200 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Zalo 0899442256
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BillingClient(props: Props) {
  return (
    <Suspense fallback={null}>
      <BillingContent {...props} />
    </Suspense>
  );
}
