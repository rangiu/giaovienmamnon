"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CreditCard, Loader2, AlertCircle, Sparkles, Clapperboard, Check } from "lucide-react";

interface Props {
  userName: string;
  accessAllowed: boolean;
}

interface VideoCreditPackage {
  id: string;
  name: string;
  tier: string; // HYBRID | VEO
  credits: number;
  priceVnd: number;
}

const TIER_INFO: Record<string, { label: string; desc: string; icon: React.ElementType; accent: string }> = {
  HYBRID: {
    label: "Hybrid",
    desc: "Ảnh minh hoạ AI + hoạt hình — rẻ, ra video nhanh",
    icon: Sparkles,
    accent: "emerald",
  },
  VEO: {
    label: "Veo",
    desc: "Video chuyển động thật — chất lượng cao, giá cao hơn",
    icon: Clapperboard,
    accent: "amber",
  },
};

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

function VideoCreditsContent({ userName, accessAllowed }: Props) {
  const searchParams = useSearchParams();
  const returnCode = searchParams.get("code");
  const returnResult = searchParams.get("result");

  const [packages, setPackages] = useState<VideoCreditPackage[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({ HYBRID: 0, VEO: 0 });
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadPackages = () => {
    setLoadingPackages(true);
    fetch("/api/billing/video-packages")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPackages(data.packages || []);
          setBalances(data.balances || { HYBRID: 0, VEO: 0 });
          if (!selectedPackageId && data.packages?.length > 0) setSelectedPackageId(data.packages[0].id);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingPackages(false));
  };

  useEffect(() => {
    loadPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createPayment = async () => {
    if (!selectedPackageId) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/payment/create-video-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: selectedPackageId }),
      });
      const data = await res.json();
      if (data.success && data.checkoutUrl && data.fields) {
        redirectToSepayCheckout(data.checkoutUrl, data.fields);
      } else {
        setError(data.error || "Không thể tạo yêu cầu thanh toán.");
        setCreating(false);
      }
    } catch {
      setError("Không thể kết nối tới máy chủ.");
      setCreating(false);
    }
  };

  // Sau khi SePay chuyển hướng khách quay lại (?code=...&result=...), poll
  // trạng thái thật từ webhook — return URL chỉ mang tính thông báo.
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
        loadPackages(); // cập nhật số dư mới
      }
    };

    checkStatus();
    pollRef.current = setInterval(checkStatus, 3000);

    const stopTimeout = setTimeout(() => {
      if (pollRef.current) clearInterval(pollRef.current);
      setPolling(false);
    }, 120000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      clearTimeout(stopTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnCode]);

  const grouped: Record<string, VideoCreditPackage[]> = { HYBRID: [], VEO: [] };
  for (const pkg of packages) {
    if (grouped[pkg.tier]) grouped[pkg.tier].push(pkg);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 px-4 py-8">
      <div className="max-w-md mx-auto space-y-5">
        {accessAllowed && (
          <Link href="/video-studio" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700">
            <ArrowLeft className="w-3.5 h-3.5" />
            Về Video Studio
          </Link>
        )}

        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-100 flex items-center justify-center shadow-lg shadow-emerald-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="SUMFLOW" className="w-9 h-9 object-contain" />
          </div>
          <h1 className="text-xl font-black text-slate-900">Nạp token tạo video</h1>
          <p className="text-xs text-slate-500">Xin chào {userName}</p>
        </div>

        <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-emerald-50 rounded-2xl p-3">
              <p className="text-[11px] text-emerald-700 font-bold">Token Hybrid</p>
              <p className="text-lg font-black text-emerald-800">{balances.HYBRID ?? 0}</p>
            </div>
            <div className="bg-amber-50 rounded-2xl p-3">
              <p className="text-[11px] text-amber-700 font-bold">Token Veo</p>
              <p className="text-lg font-black text-amber-800">{balances.VEO ?? 0}</p>
            </div>
          </div>

          {paid ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              <p className="font-bold text-slate-900">Thanh toán thành công!</p>
              <p className="text-xs text-slate-500">Tín dụng video đã được cộng vào tài khoản.</p>
              <Link
                href="/video-studio"
                className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 px-6 rounded-xl transition-colors"
              >
                Vào Video Studio
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
          ) : loadingPackages ? (
            <div className="py-6 text-center">
              <Loader2 className="w-5 h-5 text-emerald-600 animate-spin mx-auto" />
            </div>
          ) : packages.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Hiện chưa có gói tín dụng nào đang mở bán.</p>
          ) : (
            <>
              {(["HYBRID", "VEO"] as const).map((tier) =>
                grouped[tier].length === 0 ? null : (
                  <div key={tier} className="space-y-2">
                    <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      {React.createElement(TIER_INFO[tier].icon, { className: "w-3.5 h-3.5 text-slate-500" })}
                      {TIER_INFO[tier].label}
                      <span className="font-normal text-slate-400">— {TIER_INFO[tier].desc}</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {grouped[tier].map((pkg) => {
                        const isSelected = selectedPackageId === pkg.id;
                        return (
                          <button
                            key={pkg.id}
                            type="button"
                            onClick={() => setSelectedPackageId(pkg.id)}
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
                            <p className="text-[11px] font-bold">{pkg.name}</p>
                            <p className={`text-[10px] font-bold mt-0.5 ${isSelected ? "text-emerald-100" : "text-slate-400"}`}>
                              {pkg.credits} token
                            </p>
                            <p className={`text-xs font-black mt-1 ${isSelected ? "text-white" : "text-emerald-700"}`}>
                              {pkg.priceVnd.toLocaleString("vi-VN")}đ
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )
              )}

              <button
                onClick={createPayment}
                disabled={creating || !selectedPackageId}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-3 rounded-xl shadow-sm transition-colors disabled:opacity-60"
              >
                <CreditCard className="w-4 h-4" />
                {creating ? "Đang chuyển hướng..." : "Thanh toán ngay"}
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
            Tín dụng video tách riêng khỏi gói thuê bao — mua xong dùng được ngay, không giới hạn thời gian.
          </p>
        </div>
      </div>
    </div>
  );
}

export function VideoCreditsClient(props: Props) {
  return (
    <Suspense fallback={null}>
      <VideoCreditsContent {...props} />
    </Suspense>
  );
}
