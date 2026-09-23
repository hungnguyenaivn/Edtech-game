import { defineConfig } from "drizzle-kit";

// Tự đọc file .env nếu có (Node ≥ 20.12)
try {
  process.loadEnvFile?.(".env");
} catch {}

export default defineConfig({
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  // Neon trên Vercel có thêm DATABASE_URL_UNPOOLED (kết nối trực tiếp) — dùng cho việc tạo bảng
  dbCredentials: { url: (process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL)! },
});
