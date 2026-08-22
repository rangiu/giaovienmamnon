import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import { parseDocumentToText } from "./src/lib/ai/documentParser";
import { analyzeTemplateStructure } from "./src/lib/ai/templateAnalyzer";

async function inspectFile() {
  const filePath = "D:\\PRJ-2026\\giang\\OP\\TUẦN IV- CHỦ ĐỀ NHÁNH RAU CỦ QUẢ QUÊ EM.docx";
  console.log("Reading file:", filePath);

  if (!fs.existsSync(filePath)) {
    console.error("File not found at:", filePath);
    process.exit(1);
  }

  const buffer = fs.readFileSync(filePath);
  console.log(`Buffer size: ${buffer.length} bytes`);

  const parsed = await parseDocumentToText(buffer, "TUẦN IV- CHỦ ĐỀ NHÁNH RAU CỦ QUẢ QUÊ EM.docx");
  console.log("\n--- PARSED RAW TEXT (Length:", parsed.rawText.length, "chars) ---");
  console.log(parsed.rawText.slice(0, 1500));
  console.log("\n... [TRUNCATED] ...\n");

  const structure = await analyzeTemplateStructure(parsed.rawText, "TUẦN IV- CHỦ ĐỀ NHÁNH RAU CỦ QUẢ QUÊ EM.docx", "LIMITED");
  console.log("\n--- ANALYZED STRUCTURE ---");
  console.log(JSON.stringify(structure, null, 2));
}

inspectFile().catch(console.error);
