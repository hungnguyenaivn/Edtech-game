import { defineConfig } from "drizzle-kit";

// Tự đọc file .env nếu có (Node ≥ 20.12)
try {
  process.loadEnvFile?.(".env");
} catch {}

export default defineConfig({
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
