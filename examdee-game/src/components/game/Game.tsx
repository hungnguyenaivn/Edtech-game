"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameEngine } from "./engine";
import { generateMap, placeNpcs } from "./mapgen";

type Q = { id: string; type: "MCQ" | "TRUE_FALSE"; prompt: string; options: string[] };
type StartData = {
  attemptId: string;
  level: { id: string; number: number; title: string };
  world: { slug: string; name: string; color: string };
  questions: Q[];
};
type Answer = { chosenIndex: number; correct: boolean; correctIndex: number; explanation: string };

const KEYS = ["A", "B", "C", "D"];

export default function Game({ levelId, avatarColor, worldSlug }: { levelId: string; avatarColor: string; worldSlug: string }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const startedRef = useRef(false);
  const [data, setData] = useState<StartData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [active, setActive] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [near, setNear] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const answeredCount = Object.keys(answers).length;
  const total = data?.questions.length ?? 0;
  const allDone = total > 0 && answeredCount === total;

  // 1) Tạo lượt chơi
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    fetch("/api/attempts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ levelId }) })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Không bắt đầu được lượt chơi");
        setData(j);
      })
      .catch((e) => setError(e.message));
  }, [levelId]);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const openQuestion = useCallback((i: number) => {
    if (answersRef.current[i]) {
      setToast("Em đã trả lời bạn này rồi. Đi tìm bạn có dấu ? nhé!");
      return;
    }
    setActive(i);
    setSelected(null);
    engineRef.current?.setPaused(true);
  }, []);

  // 2) Khởi động bản đồ
  useEffect(() => {
    if (!data || !canvasRef.current) return;
    const map = generateMap(data.world.slug);
    const spots = placeNpcs(map, data.questions.length, data.attemptId);
    const engine = new GameEngine(canvasRef.current, map, spots, avatarColor, {
      onNear: setNear,
      onInteract: openQuestion,
    });
    engineRef.current = engine;
    engine.start();
    if (new URLSearchParams(window.location.search).has("e2e")) (window as unknown as { __vtGame: GameEngine }).__vtGame = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [data, avatarColor, openQuestion]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const submit = useCallback(async () => {
    if (!data || active === null || selected === null || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/attempts/${data.attemptId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: data.questions[active].id, chosenIndex: selected }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Lỗi chấm bài");
      setAnswers((prev) => ({ ...prev, [active]: j }));
      engineRef.current?.setNpcState(active, j.correct ? "correct" : "wrong");
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [data, active, selected, busy]);

  const closeCard = useCallback(() => {
    setActive(null);
    setSelected(null);
    // trễ một nhịp để phím Enter vừa bấm không mở lại câu hỏi
    setTimeout(() => engineRef.current?.setPaused(false), 60);
  }, []);

  const finish = useCallback(async () => {
    if (!data || finishing) return;
    setFinishing(true);
    engineRef.current?.setPaused(true);
    const r = await fetch(`/api/attempts/${data.attemptId}/finish`, { method: "POST" });
    if (r.ok) router.push(`/result/${data.attemptId}`);
    else {
      setFinishing(false);
      setToast("Không nộp được bài, em thử lại nhé.");
    }
  }, [data, finishing, router]);

  // Phím tắt trong thẻ câu hỏi
  useEffect(() => {
    if (active === null || !data) return;
    const q = data.questions[active];
    const onKey = (e: KeyboardEvent) => {
      const ans = answers[active];
      const k = e.key.toUpperCase();
      if (ans) {
        if (k === "ENTER" || k === "ESCAPE" || k === " ") {
          e.preventDefault();
          closeCard();
        }
        return;
      }
      if (k === "ESCAPE") return closeCard();
      const idx = /^[1-4]$/.test(k) ? Number(k) - 1 : KEYS.indexOf(k);
      if (idx >= 0 && idx < q.options.length) setSelected(idx);
      if (k === "ENTER" && selected !== null) {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, data, answers, selected, submit, closeCard]);

  if (error) {
    return (
      <main className="space-bg center-screen">
        <div className="result-card">
          <h1 className="title-kid">Chưa vào được level</h1>
          <p className="muted">{error}</p>
          <div className="result-actions">
            <Link href={`/world/${worldSlug}`} className="btn btn-primary btn-lg">Về danh sách level</Link>
          </div>
        </div>
      </main>
    );
  }

  const q = active !== null && data ? data.questions[active] : null;
  const ans = active !== null ? answers[active] : undefined;

  return (
    <div className="game-root">
      <canvas ref={canvasRef} className="game-canvas" />
      {!data && (
        <div className="overlay" style={{ background: "#151a3d" }}>
          <p className="title-kid" style={{ color: "#fff", fontSize: 28 }}>Đang tải bản đồ…</p>
        </div>
      )}

      {data && (
        <div className="hud">
          <div style={{ display: "flex", gap: 10 }}>
            <Link href={`/world/${data.world.slug}`} className="hud-pill" style={{ textDecoration: "none" }}>← Thoát</Link>
            <span className="hud-pill">
              <span style={{ width: 12, height: 12, borderRadius: 4, background: data.world.color, display: "inline-block" }} />
              {data.world.name} · <b>Level {data.level.number}</b> · {data.level.title}
            </span>
          </div>
          <span className="hud-pill">
            <span className="hud-dots">
              {data.questions.map((_, i) => (
                <i key={i} className={answers[i] ? (answers[i].correct ? "ok" : "no") : ""} />
              ))}
            </span>
            <b>{answeredCount}/{total}</b>
          </span>
          <button className="hud-pill" onClick={() => (allDone ? finish() : setConfirmEnd(true))} style={{ cursor: "pointer" }}>
            {allDone ? "Xem kết quả ▶" : "Nộp bài"}
          </button>
        </div>
      )}

      {data && active === null && !allDone && (
        <div className="hud-help">
          {near !== null && !answers[near] ? (
            <>Nhấn <kbd>E</kbd> để trả lời câu hỏi</>
          ) : (
            <>Đi bằng <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> hoặc <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> · bấm chuột vào bản đồ để đi tới · tìm các bạn có dấu <b>?</b></>
          )}
        </div>
      )}

      {toast && (
        <div className="hud-help" style={{ bottom: 64, background: "#4b3cccee" }}>{toast}</div>
      )}

      {q && active !== null && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && ans && closeCard()}>
          <div className="q-card" role="dialog" aria-modal="true" aria-label={`Câu ${active + 1}`}>
            <div className="q-head">
              <NpcPortrait sprite={engineRef.current?.getNpcSprite(active)} />
              <div>
                <div className="q-tag">Câu {active + 1}/{total} · {q.type === "MCQ" ? "Trắc nghiệm" : "Đúng hay sai?"}</div>
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
                  <button key={i} className={cls} disabled={!!ans || busy} onClick={() => setSelected(i)}>
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
                <button className="btn btn-primary btn-lg" onClick={closeCard}>
                  {allDone ? "Xong hết rồi! ▶" : "Tiếp tục khám phá ▶"}
                </button>
              ) : (
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-light" onClick={closeCard}>Để sau</button>
                  <button className="btn btn-primary btn-lg" disabled={selected === null || busy} onClick={submit}>
                    {busy ? "Đang chấm…" : "Trả lời"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {allDone && active === null && (
        <div className="overlay">
          <div className="result-card">
            <h1 className="title-kid">Em đã trả lời hết {total} câu! 🎉</h1>
            <p className="result-score" style={{ marginTop: 12 }}>
              Đúng {Object.values(answers).filter((a) => a.correct).length}/{total} câu
            </p>
            <div className="result-actions">
              <button className="btn btn-primary btn-lg" onClick={finish} disabled={finishing} autoFocus>
                {finishing ? "Đang tính sao…" : "Xem kết quả ▶"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmEnd && !allDone && (
        <div className="overlay">
          <div className="result-card">
            <h1 className="title-kid" style={{ fontSize: 30 }}>Nộp bài bây giờ?</h1>
            <p className="muted">
              Em mới trả lời {answeredCount}/{total} câu. Những câu chưa trả lời sẽ tính là sai.
            </p>
            <div className="result-actions">
              <button className="btn btn-light btn-lg" onClick={() => setConfirmEnd(false)}>Chơi tiếp</button>
              <button className="btn btn-primary btn-lg" onClick={finish} disabled={finishing}>
                {finishing ? "Đang nộp…" : "Nộp bài"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NpcPortrait({ sprite }: { sprite?: HTMLCanvasElement }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !sprite) return;
    const g = c.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(sprite, 0, 0, 16, 16, 0, 0, 40, 40);
  }, [sprite]);
  return (
    <div className="q-npc">
      <canvas ref={ref} width={40} height={40} />
    </div>
  );
}
