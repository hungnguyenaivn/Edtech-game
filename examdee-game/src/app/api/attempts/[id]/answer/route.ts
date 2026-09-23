import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { apiStudent, jsonError } from "@/lib/api";

const Body = z.object({ questionId: z.string().min(1), chosenIndex: z.number().int().min(0).max(3) });

/** Chấm một câu. Mỗi câu chỉ được trả lời một lần (sai thì câu đó khoá lại). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiStudent();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Dữ liệu không hợp lệ");
  const { questionId, chosenIndex } = parsed.data;

  const attempt = await db.query.attempts.findFirst({
    where: and(eq(schema.attempts.id, id), eq(schema.attempts.userId, user.id)),
  });
  if (!attempt) return jsonError("Không tìm thấy lượt chơi", 404);
  if (attempt.finishedAt) return jsonError("Lượt chơi đã kết thúc", 409);
  if (!attempt.questionIds.includes(questionId)) return jsonError("Câu hỏi không thuộc lượt chơi này");

  const q = await db.query.questions.findFirst({ where: eq(schema.questions.id, questionId) });
  if (!q) return jsonError("Không tìm thấy câu hỏi", 404);

  await db
    .insert(schema.attemptAnswers)
    .values({ attemptId: id, questionId, chosenIndex, isCorrect: chosenIndex === q.correctIndex })
    .onConflictDoNothing();
  // Đọc lại: nếu câu đã trả lời trước đó thì giữ kết quả lần đầu.
  const ans = await db.query.attemptAnswers.findFirst({
    where: and(eq(schema.attemptAnswers.attemptId, id), eq(schema.attemptAnswers.questionId, questionId)),
  });

  return NextResponse.json({
    correct: ans!.isCorrect,
    chosenIndex: ans!.chosenIndex,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
  });
}
