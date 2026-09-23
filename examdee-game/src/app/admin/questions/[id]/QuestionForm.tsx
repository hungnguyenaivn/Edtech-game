"use client";
import { useActionState, useState } from "react";
import { saveQuestion, type FormState } from "../../actions";

type Initial = {
  id: string;
  levelId: string;
  type: "MCQ" | "TRUE_FALSE";
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  active: boolean;
} | null;

export default function QuestionForm({ levels, initial, defaultLevelId }: { levels: { id: string; label: string }[]; initial: Initial; defaultLevelId?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveQuestion, {});
  const [type, setType] = useState<"MCQ" | "TRUE_FALSE">(initial?.type ?? "MCQ");
  const [correct, setCorrect] = useState(initial?.correctIndex ?? 0);
  const v = state.values;
  const opts = v ? [v.o0 ?? "", v.o1 ?? "", v.o2 ?? "", v.o3 ?? ""] : initial?.type === "MCQ" ? initial.options : ["", "", "", ""];

  return (
    <form action={action} className="form-stack">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="q-edit-grid">
        <label className="field">
          <span>Level</span>
          <select name="levelId" defaultValue={v?.levelId ?? defaultLevelId}>
            {levels.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Loại câu hỏi</span>
          <select name="type" value={type} onChange={(e) => { setType(e.target.value as "MCQ" | "TRUE_FALSE"); setCorrect(0); }}>
            <option value="MCQ">Trắc nghiệm A/B/C/D</option>
            <option value="TRUE_FALSE">Đúng / Sai</option>
          </select>
        </label>
      </div>
      <label className="field">
        <span>{type === "MCQ" ? "Đề bài" : "Mệnh đề (học sinh chọn Đúng hay Sai)"}</span>
        <textarea name="prompt" rows={2} defaultValue={v?.prompt ?? initial?.prompt} required />
      </label>

      <div className="field">
        <span>{type === "MCQ" ? "Các đáp án — chọn nút tròn ở đáp án đúng" : "Đáp án đúng"}</span>
        {type === "MCQ" ? (
          <div className="q-edit-grid">
            {[0, 1, 2, 3].map((i) => (
              <label key={i} className="opt-row">
                <input type="radio" name="correct" value={i} checked={correct === i} onChange={() => setCorrect(i)} />
                <b>{"ABCD"[i]}</b>
                <input name={`o${i}`} defaultValue={opts[i]} required style={{ flex: 1 }} />
              </label>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 24 }}>
            {["Đúng", "Sai"].map((t, i) => (
              <label key={t} className="opt-row">
                <input type="radio" name="correct" value={i} checked={correct === i} onChange={() => setCorrect(i)} /> {t}
              </label>
            ))}
          </div>
        )}
      </div>

      <label className="field">
        <span>Giải thích cho học sinh</span>
        <textarea name="explanation" rows={3} defaultValue={v?.explanation ?? initial?.explanation} required />
      </label>
      <label className="opt-row" style={{ fontWeight: 600 }}>
        <input type="checkbox" name="active" defaultChecked={v ? v.active === "on" : (initial?.active ?? true)} style={{ width: 18, height: 18 }} /> Đang bật (được bốc vào lượt chơi)
      </label>
      {state.error && <p className="form-error">{state.error}</p>}
      <div><button className="btn btn-primary btn-lg" disabled={pending}>{pending ? "Đang lưu…" : "Lưu câu hỏi"}</button></div>
    </form>
  );
}
