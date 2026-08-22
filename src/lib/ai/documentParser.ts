import mammoth from "mammoth";
// pdf-parse uses CommonJS require in Node
const pdfParse = require("pdf-parse");

export interface ParsedDocumentResult {
  success: boolean;
  rawText: string;
  fileFormat: string;
  error?: string;
}

/**
 * Trích xuất văn bản thô từ các định dạng file phổ biến (.docx, .pdf, .txt, .md, .doc)
 */
export async function parseDocumentToText(
  buffer: Buffer,
  fileName: string
): Promise<ParsedDocumentResult> {
  const ext = fileName.split(".").pop()?.toLowerCase() || "txt";

  try {
    let rawText = "";

    if (ext === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else if (ext === "pdf") {
      const data = await pdfParse(buffer);
      rawText = data.text;
    } else if (ext === "txt" || ext === "md") {
      rawText = buffer.toString("utf-8");
    } else if (ext === "doc") {
      // Đối với file .doc cũ (Word 97-2003 binary), giải mã chuỗi text và lọc ký tự printable
      const str = buffer.toString("binary");
      const cleanChars: string[] = [];
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if ((code >= 32 && code <= 126) || code === 10 || code === 13 || code === 9 || (code >= 192 && code <= 893)) {
          cleanChars.push(str.charAt(i));
        }
      }
      rawText = cleanChars.join("").replace(/\s+/g, " ");
      if (rawText.length < 20) {
        // Fallback UTF-8
        rawText = buffer.toString("utf-8").replace(/[^\x20-\x7E\s\u00C0-\u024F\u1EA0-\u1EF9]/g, " ");
      }
    } else {
      // Mặc định đọc dạng UTF-8 text
      rawText = buffer.toString("utf-8");
    }

    // Làm sạch khoảng trắng thừa
    const cleanedText = rawText
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!cleanedText || cleanedText.length < 10) {
      return {
        success: false,
        rawText: "",
        fileFormat: ext,
        error: "Không thể trích xuất văn bản từ file. Cô vui lòng kiểm tra file không bị trống hoặc thử lưu file dưới dạng .docx / .pdf nhé!",
      };
    }

    return {
      success: true,
      rawText: cleanedText,
      fileFormat: ext,
    };
  } catch (err: any) {
    console.error("parseDocumentToText error:", err);
    return {
      success: false,
      rawText: "",
      fileFormat: ext,
      error: `Lỗi khi đọc file (${ext}): ${err.message || "Định dạng file chưa được hỗ trợ."}`,
    };
  }
}
