"use client";
import { type ReactNode, useEffect } from "react";

export type Question = { id: string; type: "MCQ" | "TRUE_FALSE"; prompt: string; options: string[] };
export type AnswerResult = { chosenIndex: number; correct: boolean; correctIndex: number; explanation: string };

const KEYS = ["A", "B", "C", "D"];

/**
 * Thẻ câu hỏi (trắc nghiệm / đúng-sai) kèm phím tắt: A–D hoặc 1–4 để chọn, Enter để trả lời / đi tiếp.
 * Không có `onLater` thì không cho "Để sau" (Esc cũng không đóng thẻ khi chưa trả lời).
 */
export default function QuestionCard({
  q,
  index,
  total,
  ans,
  selected,
  busy,
  onSelect,
  onSubmit,
  onClose,
  onLater,
  head,
  closeLabel,
  laterLabel = "Để sau",
}: {
  q: Question;
  index: number;
  total: number;
  ans?: AnswerResult;
  selected: number | null;
  busy: boolean;
  onSelect: (i: number) => void;
  onSubmit: () => void;
  onClose: () => void;
  onLater?: () => void;
  head?: ReactNode;
  closeLabel: string;
  laterLabel?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toUpperCase();
      if (ans) {
        if (e.repeat) return; // giữ Enter để trả lời thì không đóng luôn thẻ — em còn đọc giải thích
        if (k === "ENTER" || k === "ESCAPE" || k === " ") {
          e.preventDefault();
          onClose();
        }
        return;
      }
      if (k === "ESCAPE") {
        onLater?.();
        return;
      }
      const idx = /^[1-4]$/.test(k) ? Number(k) - 1 : KEYS.indexOf(k);
      if (idx >= 0 && idx < q.options.length) onSelect(idx);
      if (k === "ENTER" && selected !== null) {
        e.preventDefault();
        onSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, ans, selected, onSelect, onSubmit, onClose, onLater]);

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && ans && onClose()}>
      <div className="q-card" role="dialog" aria-modal="true" aria-label={`Câu ${index + 1}`}>
        <div className="q-head">
          {head}
          <div>
            <div className="q-tag">Câu {index + 1}/{total} · {q.type === "MCQ" ? "Trắc nghiệm" : "Đúng hay sai?"}</div>
          </div>
        </div>
        <p className="q-prompt">{q.prompt}</p>
        <div className={`q-options ${q.type === "TRUE_FALSE" ? "tf" : ""}`}>
          {q.options.map((opt, i) => {
            let cls = "q-opt";
            if (ans) {
              if (i === ans.correctIndex) cls += " correct";
              else if (i === ans.chosenIndex) cls += " wrong";
            } else if (selected === i) cls += " selected";
            return (
              <button key={i} className={cls} disabled={!!ans || busy} onClick={() => onSelect(i)}>
                <span className="k">{q.type === "TRUE_FALSE" ? (i === 0 ? "Đ" : "S") : KEYS[i]}</span>
                {opt}
              </button>
            );
          })}
        </div>
        {ans && (
          <div className={`q-feedback ${ans.correct ? "ok" : "no"}`}>
            <strong>{ans.correct ? "Chính xác! 🎉" : "Chưa đúng rồi 😅"}</strong>
            {!ans.correct && <>Đáp án đúng: <b>{q.options[ans.correctIndex]}</b>. </>}
            {ans.explanation}
          </div>
        )}
        <div className="q-foot">
          <span className="small">
            {ans ? "Nhấn Enter để đi tiếp" : q.type === "MCQ" ? "Chọn bằng chuột hoặc phím A B C D, rồi nhấn Enter" : "Chọn Đúng (1) hoặc Sai (2), rồi nhấn Enter"}
          </span>
          {ans ? (
            <button className="btn btn-primary btn-lg" onClick={onClose}>{closeLabel}</button>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              {onLater && <button className="btn btn-light" onClick={onLater}>{laterLabel}</button>}
              <button className="btn btn-primary btn-lg" disabled={selected === null || busy} onClick={onSubmit}>
                {busy ? "Đang chấm…" : "Trả lời"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
