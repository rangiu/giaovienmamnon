import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/** Tải 1 chuỗi nội dung xuống máy dưới dạng file, dùng chung cho cả 3 định dạng. */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function safeFileName(title: string) {
  return (title || "noi-dung")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // bỏ dấu tiếng Việt cho tên file gọn
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60);
}

export function exportAsTxt(title: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, `${safeFileName(title)}.txt`);
}

/**
 * Xuất .doc mở được thật trong Microsoft Word / LibreOffice / Google Docs —
 * dùng kỹ thuật HTML-as-Word chuẩn (khai báo mso-application/word), KHÔNG
 * phải file OOXML .docx nhị phân thật, nhưng Word nhận diện và mở đúng nội
 * dung, giữ định dạng cơ bản (không phải file giả/rỗng).
 */
export function exportAsDoc(title: string, content: string) {
  const escapedContent = content
    .split("\n")
    .map((line) => `<p style="margin:0 0 8px 0;">${line.replace(/&/g, "&amp;").replace(/</g, "&lt;") || "&nbsp;"}</p>`)
    .join("");

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
  <style>
    body { font-family: "Times New Roman", serif; font-size: 13pt; line-height: 1.5; }
    h1 { font-size: 16pt; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${escapedContent}
</body>
</html>`;

  const blob = new Blob(["﻿", html], { type: "application/msword;charset=utf-8" });
  downloadBlob(blob, `${safeFileName(title)}.doc`);
}

/**
 * Xuất PDF bằng cách render HTML thật ra ảnh rồi nhúng vào jsPDF (giống
 * đúng kỹ thuật đã dùng ở trang Sổ đánh giá sau chủ đề) — KHÔNG dùng
 * doc.text() trực tiếp của jsPDF vì font mặc định (Helvetica) không có đủ
 * dấu tiếng Việt, sẽ in ra chữ bị mất dấu/lỗi font.
 */
export async function exportAsPdf(title: string, content: string) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "760px";
  container.style.padding = "32px";
  container.style.background = "#ffffff";
  container.style.fontFamily = "Arial, sans-serif";
  container.style.color = "#1e293b";

  const escapedTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const escapedContent = content
    .split("\n")
    .map((line) => `<p style="margin:0 0 10px 0; white-space:pre-wrap;">${line.replace(/&/g, "&amp;").replace(/</g, "&lt;") || "&nbsp;"}</p>`)
    .join("");

  container.innerHTML = `
    <h1 style="font-size:20px; color:#047857; border-bottom:2px solid #059669; padding-bottom:10px; margin:0 0 16px 0;">${escapedTitle}</h1>
    <div style="font-size:13px; line-height:1.6;">${escapedContent}</div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidthMm = pdfWidth;
    const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

    let heightLeft = imgHeightMm;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidthMm, imgHeightMm);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeightMm;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidthMm, imgHeightMm);
      heightLeft -= pdfHeight;
    }

    pdf.save(`${safeFileName(title)}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
