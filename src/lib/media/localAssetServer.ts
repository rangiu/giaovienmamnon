import http from "node:http";
import fs from "node:fs";
import path from "node:path";

/**
 * Máy chủ tĩnh cục bộ tạm thời (127.0.0.1, port ngẫu nhiên) để phục vụ ảnh/
 * audio của 1 job cho Remotion render. LÝ DO CẦN CÁI NÀY: đã test thật —
 * Chromium headless của Remotion CHẶN HẲN việc load `file://` (lỗi "Not
 * allowed to load local resource"), nên không thể trỏ thẳng đường dẫn ổ
 * đĩa vào <Img>/<Audio> dù chạy 100% local. Giải pháp chuẩn của cộng đồng
 * Remotion cho asset sinh ra lúc runtime (không có sẵn lúc bundle) là serve
 * qua HTTP tạm thời như thế này thay vì file://.
 */
export interface LocalAssetServer {
  baseUrl: string;
  close: () => Promise<void>;
}

export async function startLocalAssetServer(rootDir: string): Promise<LocalAssetServer> {
  const normalizedRoot = path.resolve(rootDir);

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        const filePath = path.resolve(normalizedRoot, "." + urlPath);
        // Chặn path traversal ra ngoài rootDir (VD "../../..").
        if (!filePath.startsWith(normalizedRoot)) {
          res.writeHead(403);
          res.end();
          return;
        }
        const stream = fs.createReadStream(filePath);
        stream.on("error", () => {
          res.writeHead(404);
          res.end();
        });
        stream.pipe(res);
      } catch {
        res.writeHead(500);
        res.end();
      }
    });

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise<void>((res) => server.close(() => res())),
      });
    });
  });
}
