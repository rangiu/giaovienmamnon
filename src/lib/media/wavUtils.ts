/**
 * Đọc thời lượng THẬT (giây) của 1 file WAV bằng cách quét đúng cấu trúc
 * chunk RIFF/WAVE (KHÔNG giả định cứng offset 44 byte) — an toàn cho cả 2
 * nguồn TTS đang dùng: Gemini (tự bọc header 44 byte, xem ttsEngine.ts) và
 * MiniMax qua proxy (trả WAV hoàn chỉnh, có thể có thêm chunk khác trước
 * "data" tuỳ implementation của họ).
 *
 * Dùng để THAY THẾ độ dài AI tự đoán (storyboard "durationSeconds") bằng độ
 * dài THẬT của giọng đọc đã tổng hợp — bug thật đã gặp: AI đoán durationSeconds
 * không khớp giọng đọc thật, khiến phụ đề/cảnh chạy nhanh/chậm hơn lời thoại
 * thật (xem hybridPipeline.ts).
 */
export function getWavDurationSeconds(wav: Buffer): number | null {
  try {
    if (wav.length < 12 || wav.toString("ascii", 0, 4) !== "RIFF" || wav.toString("ascii", 8, 12) !== "WAVE") {
      return null;
    }

    let offset = 12;
    let sampleRate: number | null = null;
    let channels: number | null = null;
    let bitsPerSample: number | null = null;
    let dataBytes: number | null = null;

    while (offset + 8 <= wav.length) {
      const chunkId = wav.toString("ascii", offset, offset + 4);
      const chunkSize = wav.readUInt32LE(offset + 4);
      const chunkStart = offset + 8;

      if (chunkId === "fmt " && chunkStart + 16 <= wav.length) {
        channels = wav.readUInt16LE(chunkStart + 2);
        sampleRate = wav.readUInt32LE(chunkStart + 4);
        bitsPerSample = wav.readUInt16LE(chunkStart + 14);
      } else if (chunkId === "data") {
        dataBytes = Math.min(chunkSize, wav.length - chunkStart);
      }

      // Chunk có padding byte lẻ (RIFF spec: mỗi chunk căn chẵn) — cộng thêm 1 nếu size lẻ.
      offset = chunkStart + chunkSize + (chunkSize % 2);
    }

    if (!sampleRate || !channels || !bitsPerSample || dataBytes == null) return null;
    const bytesPerSecond = sampleRate * channels * (bitsPerSample / 8);
    if (bytesPerSecond <= 0) return null;
    return dataBytes / bytesPerSecond;
  } catch {
    return null;
  }
}
