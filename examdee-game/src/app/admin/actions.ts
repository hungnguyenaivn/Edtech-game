"use server";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireTeacher } from "@/lib/auth";

export type FormState = { error?: string; ok?: string; values?: Record<string, string> };

/** Giữ lại dữ liệu đã nhập khi báo lỗi (React tự xoá form sau mỗi lần gửi). */
function keep(form: FormData, omit: string[] = []): Record<string, string> {
  const out: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string" && !omit.includes(k) && !k.startsWith("$")) out[k] = v;
  });
  return out;
}

// ---------------------------------------------------------------- Học sinh

const NewStudent = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,30}$/, "Tên đăng nhập 3–30 ký tự: chữ không dấu, số, dấu . _ -"),
  displayName: z.string().trim().min(2, "Nhập họ tên học sinh").max(60),
  password: z.string().min(6, "Mật khẩu ít nhất 6 ký tự").max(72),
  avatar: z.coerce.number().int().min(0).max(5),
});

export async function createStudent(_p: FormState, form: FormData): Promise<FormState> {
  const teacher = await requireTeacher();
  const parsed = NewStudent.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: keep(form, ["password"]) };
  const d = parsed.data;
  const exists = await db.query.users.findFirst({ where: eq(schema.users.username, d.username) });
  if (exists) return { error: `Tên đăng nhập «${d.username}» đã có người dùng`, values: keep(form, ["password"]) };
  await db.insert(schema.users).values({
    username: d.username,
    displayName: d.displayName,
    passwordHash: await bcrypt.hash(d.password, 10),
    role: "STUDENT",
    avatar: d.avatar,
    classId: teacher.classId,
  });
  revalidatePath("/admin", "layout");
  return { ok: `Đã tạo tài khoản ${d.username} cho ${d.displayName}` };
}

async function ownStudent(teacherClassId: string | null, studentId: string) {
  const s = await db.query.users.findFirst({ where: eq(schema.users.id, studentId) });
  if (!s || s.role !== "STUDENT" || s.classId !== teacherClassId) return null;
  return s;
}

export async function resetPassword(_p: FormState, form: FormData): Promise<FormState> {
  const teacher = await requireTeacher();
  const id = String(form.get("id") ?? "");
  const password = String(form.get("password") ?? "");
  if (password.length < 6) return { error: "Mật khẩu ít nhất 6 ký tự" };
  const s = await ownStudent(teacher.classId, id);
  if (!s) return { error: "Không tìm thấy học sinh trong lớp của cô/thầy" };
  await db.update(schema.users).set({ passwordHash: await bcrypt.hash(password, 10) }).where(eq(schema.users.id, id));
  return { ok: `Đã đổi mật khẩu cho ${s.displayName}` };
}

export async function deleteStudent(form: FormData) {
  const teacher = await requireTeacher();
  const id = String(form.get("id") ?? "");
  const s = await ownStudent(teacher.classId, id);
  if (s) await db.delete(schema.users).where(eq(schema.users.id, id));
  revalidatePath("/admin", "layout");
  redirect("/admin/students");
}

export async function resetProgress(form: FormData) {
  const teacher = await requireTeacher();
  const id = String(form.get("id") ?? "");
  const s = await ownStudent(teacher.classId, id);
  if (s) {
    await db.delete(schema.attempts).where(eq(schema.attempts.userId, id));
    await db.delete(schema.levelProgress).where(eq(schema.levelProgress.userId, id));
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/students/${id}`);
}

// ---------------------------------------------------------------- Câu hỏi

const QuestionInput = z
  .object({
    levelId: z.string().min(1, "Chọn level"),
    type: z.enum(["MCQ", "TRUE_FALSE"]),
    prompt: z.string().trim().min(5, "Đề bài quá ngắn").max(300),
    o0: z.string().trim().max(80).optional().default(""),
    o1: z.string().trim().max(80).optional().default(""),
    o2: z.string().trim().max(80).optional().default(""),
    o3: z.string().trim().max(80).optional().default(""),
    correct: z.coerce.number().int().min(0).max(3),
    explanation: z.string().trim().min(3, "Nhập lời giải thích cho học sinh").max(400),
    active: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "MCQ") {
      const opts = [v.o0, v.o1, v.o2, v.o3];
      if (opts.some((o) => !o)) ctx.addIssue({ code: "custom", message: "Trắc nghiệm cần đủ 4 đáp án A, B, C, D" });
      if (new Set(opts.map((o) => o.toLowerCase())).size < 4) ctx.addIssue({ code: "custom", message: "Bốn đáp án không được trùng nhau" });
    } else if (v.correct > 1) ctx.addIssue({ code: "custom", message: "Câu Đúng/Sai chỉ chọn Đúng hoặc Sai" });
  });

function toRow(v: z.infer<typeof QuestionInput>) {
  return {
    levelId: v.levelId,
    type: v.type,
    prompt: v.prompt,
    options: v.type === "MCQ" ? [v.o0, v.o1, v.o2, v.o3] : ["Đúng", "Sai"],
    correctIndex: v.correct,
    explanation: v.explanation,
    active: v.active === "on",
  };
}

export async function saveQuestion(_p: FormState, form: FormData): Promise<FormState> {
  await requireTeacher();
  const id = String(form.get("id") ?? "");
  const parsed = QuestionInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: keep(form) };
  const level = await db.query.levels.findFirst({ where: eq(schema.levels.id, parsed.data.levelId) });
  if (!level) return { error: "Level không tồn tại", values: keep(form) };
  const row = toRow(parsed.data);
  if (id) {
    await db.update(schema.questions).set({ ...row, updatedAt: new Date() }).where(eq(schema.questions.id, id));
  } else {
    await db.insert(schema.questions).values(row);
  }
  revalidatePath("/admin/questions");
  redirect(`/admin/questions?level=${row.levelId}&saved=1`);
}

export async function toggleQuestion(form: FormData) {
  await requireTeacher();
  const id = String(form.get("id") ?? "");
  const q = await db.query.questions.findFirst({ where: eq(schema.questions.id, id) });
  if (q) await db.update(schema.questions).set({ active: !q.active, updatedAt: new Date() }).where(eq(schema.questions.id, id));
  revalidatePath("/admin/questions");
}

export async function deleteQuestion(form: FormData) {
  await requireTeacher();
  const id = String(form.get("id") ?? "");
  const q = await db.query.questions.findFirst({ where: eq(schema.questions.id, id) });
  if (q) await db.delete(schema.questions).where(and(eq(schema.questions.id, id)));
  revalidatePath("/admin/questions");
  redirect(`/admin/questions?level=${q?.levelId ?? ""}`);
}
