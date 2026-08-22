import fs from "fs";
import mammoth from "mammoth";

async function checkFormats() {
  const origBuffer = fs.readFileSync("D:\\PRJ-2026\\giang\\OP\\TUẦN IV- CHỦ ĐỀ NHÁNH RAU CỦ QUẢ QUÊ EM.docx");
  const outBuffer = fs.readFileSync("D:\\PRJ-2026\\giang\\OP\\SUMFLOW_-_Ket_qua_tra_loi.docx");

  const origHtml = await mammoth.convertToHtml({ buffer: origBuffer });
  const outHtml = await mammoth.convertToHtml({ buffer: outBuffer });

  console.log("=== SO SÁNH CHI TIẾT FORMAT GỐC VS OUTPUT ===");

  console.log("\n1. TIÊU ĐỀ CHÍNH CỦA BÀI GỐC:");
  const origHeadings = origHtml.value.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/g) || [];
  console.log(origHeadings.slice(0, 10).join("\n"));

  console.log("\n2. TIÊU ĐỀ CHÍNH CỦA OUTPUT AI:");
  const outHeadings = outHtml.value.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/g) || [];
  console.log(outHeadings.slice(0, 10).join("\n"));

  console.log("\n3. MẪU BẢNG 1 (GÓC CHƠI) TRONG NGUYÊN BẢN GỐC:");
  const origTableMatch = origHtml.value.match(/<table[^>]*>([\s\S]*?)<\/table>/);
  if (origTableMatch) console.log(origTableMatch[0].slice(0, 500));

  console.log("\n4. MẪU BẢNG 1 (GÓC CHƠI) TRONG OUTPUT AI:");
  const outTableMatch = outHtml.value.match(/<table[^>]*>([\s\S]*?)<\/table>/);
  if (outTableMatch) console.log(outTableMatch[0].slice(0, 500));
}

checkFormats().catch(console.error);
