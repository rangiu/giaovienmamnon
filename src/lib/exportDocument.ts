import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  AlignmentType,
} from "docx";

/** Tải 1 chuỗi nội dung xuống máy dưới dạng file. */
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
 * Xuất file .docx nhị phân thật mở bằng Microsoft Word chuẩn 100%,
 * tự động dựng Bảng (Tables) kẻ ô, Cột và Định dạng từ văn bản Markdown.
 */
export async function exportAsDocx(title: string, content: string) {
  const lines = content.split("\n");
  const children: any[] = [];

  // Tiêu đề chính của tài liệu
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 32, // 16pt
          font: "Times New Roman",
          color: "047857",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  let currentTableRows: string[][] = [];

  const flushTable = () => {
    if (currentTableRows.length === 0) return;
    // Lọc bỏ dòng kẻ vạch ngăn cách dạng |---|---|
    const validRows = currentTableRows.filter(
      (row) => !row.every((cell) => /^[\s\-:|]+$/.test(cell))
    );

    if (validRows.length > 0) {
      const tableRows = validRows.map((rowCells, rowIndex) => {
        const isHeader = rowIndex === 0;
        return new TableRow({
          children: rowCells.map(
            (cellText) => {
              const isBoldCell = isHeader || cellText.includes("**");
              const cleanCellText = cellText.replace(/\*\*/g, "").replace(/<br\s*\/?>/gi, "\n").trim();
              return new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: cleanCellText,
                        bold: isBoldCell,
                        size: isHeader ? 22 : 20, // 11pt hoặc 10pt
                        font: "Times New Roman",
                        color: isHeader ? "065F46" : "1E293B",
                      }),
                    ],
                  }),
                ],
                shading: isHeader ? { fill: "ECFDF5" } : undefined, // Nền xanh ngọc nhẹ cho tiêu đề bảng
                width: { size: Math.floor(100 / Math.max(rowCells.length, 1)), type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 150, right: 150 },
              });
            }
          ),
        });
      });

      children.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
      children.push(new Paragraph({ text: "", spacing: { after: 150 } }));
    }
    currentTableRows = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Phát hiện dòng Bảng Markdown dạng | Cột 1 | Cột 2 |
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      currentTableRows.push(cells);
      continue;
    } else {
      flushTable();
    }

    if (!trimmed) {
      children.push(new Paragraph({ text: "", spacing: { after: 100 } }));
      continue;
    }

    // Tiêu đề các cấp (#, ##, ###)
    if (trimmed.startsWith("# ")) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed.replace(/^#\s+/, ""),
              bold: true,
              size: 28, // 14pt
              font: "Times New Roman",
              color: "047857",
            }),
          ],
          spacing: { before: 240, after: 120 },
        })
      );
    } else if (trimmed.startsWith("## ")) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed.replace(/^##\s+/, ""),
              bold: true,
              size: 26, // 13pt
              font: "Times New Roman",
              color: "065F46",
            }),
          ],
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (trimmed.startsWith("### ")) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed.replace(/^###\s+/, ""),
              bold: true,
              size: 24, // 12pt
              font: "Times New Roman",
              color: "0F766E",
            }),
          ],
          spacing: { before: 160, after: 80 },
        })
      );
    } else {
      // Đoạn văn có xử lý chữ in đậm **text**
      const runs: TextRun[] = [];
      const parts = trimmed.split(/(\*\*.*?\*\*)/g);

      for (const part of parts) {
        if (part.startsWith("**") && part.endsWith("**")) {
          runs.push(
            new TextRun({
              text: part.slice(2, -2),
              bold: true,
              font: "Times New Roman",
              size: 24, // 12pt
            })
          );
        } else if (part) {
          runs.push(
            new TextRun({
              text: part,
              font: "Times New Roman",
              size: 24, // 12pt
            })
          );
        }
      }

      children.push(
        new Paragraph({
          children: runs,
          spacing: { after: 100 },
        })
      );
    }
  }

  flushTable();

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${safeFileName(title)}.docx`);
}

/** Tương thích ngược cho các nút gọi exportAsDoc cũ -> dùng thẳng exportAsDocx */
export function exportAsDoc(title: string, content: string) {
  exportAsDocx(title, content);
}

/**
 * Xuất PDF bằng cách render HTML thật ra ảnh rồi nhúng vào jsPDF
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
