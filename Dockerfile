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

# Tải sẵn Chrome Headless Shell cho Remotion NGAY Ở STAGE NÀY (không phải
# stage runner) — builder có ĐẦY ĐỦ node_modules (npm ci đầy đủ, kể cả
# @remotion/cli), còn runner chỉ có node_modules RÚT GỌN theo Next.js
# "output: standalone" tracing + vài gói copy tay — thử chạy lệnh CLI ở
# runner bị lỗi thật "MODULE_NOT_FOUND" vì thiếu nhiều gói phụ trợ của
# @remotion/cli không nằm trong diện được copy tay. Trình duyệt tải về nằm
# ở node_modules/.remotion/ (đã xác nhận qua test local), KHÔNG phụ thuộc
# HOME — chỉ cần copy đúng thư mục này sang runner là đủ, không cần chạy
# lại CLI ở đó nữa.
RUN npx remotion browser ensure

# ===== Giai đoạn 3: chạy production (ảnh tối giản) =====
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# openssl: Prisma engine. ffmpeg: ghép clip Tier Veo (concat). Còn lại: thư
# viện hệ thống Chrome Headless Shell cần để Remotion render Tier Hybrid —
# danh sách đúng theo hướng dẫn chính thức remotion.dev/docs/docker, KHÔNG
# ghim version (tránh gãy khi Debian cập nhật repo).
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends \
      openssl \
      ffmpeg \
      libnss3 \
      libdbus-1-3 \
      libatk1.0-0 \
      libgbm-dev \
      libasound2 \
      libxrandr2 \
      libxkbcommon-dev \
      libxfixes3 \
      libxcomposite1 \
      libxdamage1 \
      libatk-bridge2.0-0 \
      libpango-1.0-0 \
      libcairo2 \
      libcups2 \
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
# Chrome Headless Shell đã tải sẵn ở stage builder (xem giải thích ở
# RUN npx remotion browser ensure phía trên) — chỉ cần copy nguyên thư mục
# cache này sang, KHÔNG cần chạy lại CLI ở runner (thiếu node_modules đầy
# đủ nên chạy CLI ở đây sẽ lỗi MODULE_NOT_FOUND).
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.remotion ./node_modules/.remotion
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/mammoth ./node_modules/mammoth
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pdf-parse ./node_modules/pdf-parse
RUN chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
