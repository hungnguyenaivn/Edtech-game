# Vũ trụ Tri thức — web game học tập (bản chạy thử)

Học sinh đăng nhập → chọn **thế giới** (AI Công nghệ · Toán Lý Hóa · Tiếng Anh) → chọn **level** (5 level, càng cao càng khó) → vào **bản đồ mở pixel** đi quanh, gặp nhân vật có dấu **?** để trả lời câu hỏi. Giáo viên có trang quản trị riêng.

## Luật chơi

| | |
|---|---|
| Mỗi level | 10 câu bốc ngẫu nhiên từ ngân hàng (mặc định 15 câu/level) — chơi lại sẽ đổi câu |
| Dạng câu | Trắc nghiệm A/B/C/D · Đúng/Sai |
| Trả lời sai | Hiện đáp án đúng + giải thích, câu đó khoá lại (không làm lại trong lượt) |
| Sao | 7–8 đúng = ★ · 9 đúng = ★★ · 10 đúng = ★★★ · dưới 7 = chưa qua |
| Mở level | Level sau mở khi level trước đúng ≥ 70 % (≥ 7/10) |
| Chơi lại | Giữ kết quả cao nhất |
| Xếp hạng lớp | Theo tổng sao, hoà thì theo tổng câu đúng |
| Không có | Tim/mạng, đồng hồ đếm ngược |

Điều khiển: mũi tên hoặc WASD · bấm chuột vào bản đồ để tự đi tới · **E** / Space / Enter để nói chuyện · trong thẻ câu hỏi: phím A–D (hoặc 1–4) rồi Enter.

## Tài khoản mẫu

| Vai trò | Tên đăng nhập | Mật khẩu |
|---|---|---|
| Giáo viên (Cô Hoa, Lớp 4A) | `giaovien` | `gv123456` |
| Học sinh | `hs01` … `hs05` | `123456` |

> Khi deploy thật, đặt biến `TEACHER_PASSWORD` để tài khoản giáo viên không dùng mật khẩu mẫu.

## Chạy trên máy (khoảng 5 phút)

Cần: Node.js ≥ 20.12, Docker (hoặc một Postgres có sẵn).

```bash
npm install
cp .env.example .env          # giữ nguyên nếu dùng docker-compose
docker compose up -d          # bật Postgres
npm run db:setup              # tạo bảng + nạp dữ liệu mẫu (225 câu)
npm run dev                   # mở http://localhost:3000
```

Bản production: `npm run build && npm start`.
Nạp lại dữ liệu mẫu (**xoá sạch** tiến độ): `npm run db:seed`.

## Deploy lên mạng (GitHub + Vercel + Neon) — không cần cài gì trên máy

Khi build trên Vercel, `vercel.json` chạy `npm run vercel-build`: tự tạo bảng → **nạp dữ liệu mẫu nếu database còn trống** → build. Deploy lại lần sau **không xoá** tiến độ của học sinh.

1. **GitHub** — tạo repo mới (Private) → *uploading an existing file* → kéo **toàn bộ nội dung bên trong** thư mục `examdee-game` (không kéo chính thư mục) → Commit.
2. **Vercel → Add New → Project** → Import repo vừa tạo. **Chưa bấm Deploy**, mở *Environment Variables* thêm:
   - `SESSION_SECRET` = chuỗi ngẫu nhiên ≥ 32 ký tự
   - `TEACHER_PASSWORD` = mật khẩu cho tài khoản `giaovien` (không đặt thì là `gv123456`)
3. Bấm **Deploy**. Lần đầu sẽ **báo lỗi thiếu DATABASE_URL — bình thường**, vì chưa có database.
4. Trong project: tab **Storage → Create Database → Neon** (chọn region Singapore, gói Free) → **Connect Project**, tick cả Production + Preview. Vercel tự thêm `DATABASE_URL`.
5. Tab **Deployments** → bản mới nhất → **⋯ → Redeploy**. Build log phải có dòng «Database trống — nạp dữ liệu mẫu…».
6. Kiểm tra: `https://<tên-app>.vercel.app/api/health` trả `{"ok":true}`, rồi đăng nhập `hs01 / 123456`.

Sửa code sau này: sửa file trên GitHub → Vercel tự deploy lại.
Muốn xoá sạch và nạp lại dữ liệu mẫu: trên máy đặt `DATABASE_URL` (lấy ở Vercel → Settings → Environment Variables) vào `.env` rồi chạy `npm run db:seed`.

## Kiểm thử tự động

Chạy toàn luồng bằng trình duyệt (đăng nhập sai/đúng → chơi hết level 1 với 8/10 đúng → mở level 2 → nộp sớm → xếp hạng → giáo viên tạo học sinh, thêm câu hỏi):

```bash
npm i -D playwright && npx playwright install chromium
npm run db:seed && npm run build && npm start &
DATABASE_URL=postgresql://game:game@localhost:5432/game npm run test:e2e   # ảnh chụp trong e2e-shots/
```

## Công nghệ

- **Next.js 15** (App Router, Server Actions) + TypeScript
- **Postgres** + **Drizzle ORM** (`src/db/schema.ts`)
- Đăng nhập: mật khẩu băm **bcrypt**, phiên là cookie httpOnly ký **JWT** (jose); middleware chặn học sinh vào `/admin`
- Game: **Canvas 2D** tự viết, không thư viện; toàn bộ pixel-art vẽ bằng code (`src/components/game/sprites.ts`), không cần file ảnh

## Cấu trúc

```
db/
  questions/*.ts        ngân hàng câu hỏi mẫu (3 thế giới × 5 level × 15 câu)
  seed.ts               nạp dữ liệu mẫu
src/
  db/schema.ts          bảng: class_rooms, users, worlds, levels, questions, attempts, attempt_answers, level_progress
  lib/rules.ts          luật chơi (số câu, ngưỡng qua, cách tính sao) — sửa ở đây
  lib/progress.ts       khoá/mở level, xếp hạng
  app/api/attempts/     bắt đầu lượt · chấm từng câu · nộp bài (chấm trên server, đáp án không gửi xuống trình duyệt)
  app/home, world, play, result, leaderboard   màn học sinh
  app/admin/            trang giáo viên: tiến độ lớp · học sinh · câu hỏi
  components/game/      mapgen.ts (sinh bản đồ) · engine.ts (di chuyển, va chạm, tìm đường) · Game.tsx (HUD, thẻ câu hỏi)
```

## Việc tiếp theo gợi ý

- Thay hành tinh vẽ tạm bằng hình từ Figma; thuê hoạ sĩ vẽ tileset riêng
- Âm thanh, hiệu ứng khi trả lời đúng; đọc to câu hỏi (NGHE ĐỌC) cho học sinh nhỏ
- Nhập câu hỏi/học sinh hàng loạt từ Excel; nhiều lớp / nhiều giáo viên
- Giáo viên đổi mật khẩu của chính mình; giới hạn số lần đăng nhập sai
