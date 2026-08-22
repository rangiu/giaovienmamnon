# ===== Giai đoạn 1: cài dependencies =====
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ===== Giai đoạn 2: build =====
FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
# Build không cần DB thật; DATABASE_URL giả chỉ để qua bước nạp env
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/placeholder"
RUN npm run build

# ===== Giai đoạn 3: chạy production (ảnh tối giản) =====
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV REMOTION_PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# openssl: Prisma engine. ffmpeg: ghép clip. chromium: Remotion video rendering.
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends \
      openssl \
      ffmpeg \
      chromium \
      fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*
# Bug thật đã gặp: image này TRƯỚC ĐÓ không cài font nào cả — Chromium
# headless của Remotion render phụ đề (Composition.tsx) bằng font fallback
# nội bộ, vẽ SAI dấu ngã tiếng Việt (VD "dã" hiện thành "dā" — dấu ngã bị vẽ
# nhầm thành dấu ngang, xác nhận qua ảnh khung hình thật trích từ video đã
# render). fonts-noto-core có đủ glyph tiếng Việt (Latin Extended) chuẩn.

# Người dùng không đặc quyền
RUN groupadd --system nodejs && useradd --system --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Prisma Client (generated) + schema — cần cho "prisma migrate deploy" ở container migrate
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# remotion/*.tsx KHÔNG được Next.js "output: standalone" trace tự động —
# @remotion/bundler đọc file này bằng ĐƯỜNG DẪN lúc RUNTIME (không phải
# import tĩnh trong module graph của Next), nên Next không biết nó tồn tại.
# Tương tự, gói "remotion"/"@remotion/*" cần cho chính việc bundle/render
# đó cũng copy tay thẳng từ node_modules đầy đủ ở builder, giống hệt lý do
# .prisma phải copy tay ở trên (tracing không nắm được các trường hợp
# "đọc file/module lúc runtime" kiểu này).
COPY --from=builder --chown=nextjs:nodejs /app/remotion ./remotion
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/remotion ./node_modules/remotion
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@remotion ./node_modules/@remotion
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/mammoth ./node_modules/mammoth
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pdf-parse ./node_modules/pdf-parse
RUN chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
