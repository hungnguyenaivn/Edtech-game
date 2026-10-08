"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { passMark } from "@/lib/rules";
import QuestionCard, { type AnswerResult, type Question } from "../QuestionCard";
import { hashString } from "../sprites";
import { BossEngine, type BossHud } from "./BossEngine";

type StartData = {
  attemptId: string;
  level: { id: string; number: number; title: string };
  world: { slug: string; name: string; color: string };
  questions: Question[];
};

const DPAD = [
  { cls: "up", key: "arrowup", label: "▲" },
  { cls: "left", key: "arrowleft", label: "◀" },
  { cls: "right", key: "arrowright", label: "▶" },
  { cls: "down", key: "arrowdown", label: "▼" },
];

/** Màn đánh boss (level boss của Cyber World): đánh boss để rơi Mảnh mã, nhặt Mảnh mã để trả lời câu hỏi. */
export default function BossGame({ levelId, worldSlug, avatarColor, skin }: { levelId: string; worldSlug: string; avatarColor: string; skin: string }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BossEngine | null>(null);
  const startedRef = useRef(false);
  const [data, setData] = useState<StartData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hud, setHud] = useState<BossHud | null>(null);
  const [answers, setAnswers] = useState<AnswerResult[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [finishing, setFinishing] = useState(false);
  /** gửi đáp án bị lỗi (mất mạng, hết phiên…) → cho phép thoát khỏi thẻ câu hỏi */
  const [answerError, setAnswerError] = useState(false);

  const total = data?.questions.length ?? 0;
  const answered = answers.filter(Boolean).length;
  const correct = answers.filter((a) => a?.correct).length;
  const allDone = total > 0 && answered === total;

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

  // 2) Khởi động đấu trường
  useEffect(() => {
    if (!data || !canvasRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const seed = params.has("seed") ? Number(params.get("seed")) >>> 0 : hashString(data.attemptId);
    const engine = new BossEngine(canvasRef.current, seed, data.questions.length, avatarColor, skin, {
      onChip: () => {
        setActive(answersRef.current.filter(Boolean).length);
        setSelected(null);
      },
      onHud: setHud,
      onPauseKey: () => {
        engineRef.current?.setPaused(true);
        setMenu(true);
      },
    });
    engineRef.current = engine;
    engine.start();
    if (params.has("e2e")) (window as unknown as { __vtBoss: BossEngine }).__vtBoss = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [data, avatarColor, skin]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
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
      setAnswers((prev) => {
        const next = [...prev];
        next[active] = j;
        return next;
      });
      setAnswerError(false);
    } catch (e) {
      setToast((e as Error).message);
      setAnswerError(true);
    } finally {
      setBusy(false);
    }
  }, [data, active, selected, busy]);

  const closeCard = useCallback(() => {
    const ans = active !== null ? answersRef.current[active] : undefined;
    if (!ans) return;
    setActive(null);
    setSelected(null);
    engineRef.current?.answer(ans.correct);
    // câu cuối: giữ trận dừng (màn kết thúc hiện ra). Còn lại: trễ một nhịp để phím Enter vừa bấm không thành đòn đánh
    if (answersRef.current.filter(Boolean).length < total) setTimeout(() => engineRef.current?.setPaused(false), 60);
  }, [active, total]);

  const finish = useCallback(async () => {
    if (!data || finishing) return;
    setFinishing(true);
    engineRef.current?.setPaused(true);
    try {
      const r = await fetch(`/api/attempts/${data.attemptId}/finish`, { method: "POST" });
      if (!r.ok) throw new Error();
      router.push(`/result/${data.attemptId}`);
    } catch {
      setFinishing(false);
      setToast("Không nộp được bài, em thử lại nhé.");
    }
  }, [data, finishing, router]);

  const resume = () => {
    setMenu(false);
    setConfirmEnd(false);
    setTimeout(() => engineRef.current?.setPaused(false), 60);
  };

  if (error) {
    return (
      <main className="space-bg center-screen">
        <div className="result-card">
          <h1 className="title-kid">Chưa vào được trận boss</h1>
          <p className="muted">{error}</p>
          <div className="result-actions">
            <Link href={`/world/${worldSlug}`} className="btn btn-primary btn-lg">Về bản đồ</Link>
          </div>
        </div>
      </main>
    );
  }

  const q = active !== null && data ? data.questions[active] : null;
  const won = correct >= passMark(total);

  return (
    <div className="game-root boss-root">
      <div className="boss-stage">
        <canvas ref={canvasRef} className="game-canvas" role="img" aria-label="Đấu trường boss Tường lửa" />
      </div>
      {!data && (
        <div className="overlay" style={{ background: "#070b1c" }}>
          <p className="title-kid" style={{ color: "#fff", fontSize: 28 }}>Boss đang tới…</p>
        </div>
      )}

      {data && (
        <div className="hud boss-hud">
          <div style={{ display: "flex", gap: 10 }}>
            <Link href={`/world/${data.world.slug}`} className="hud-pill" style={{ textDecoration: "none" }}>← Thoát</Link>
            <span className="hud-pill boss-hearts" role="img" aria-label={`Máu ${hud?.hp ?? 0}/${hud?.maxHp ?? 0}`}>
              {Array.from({ length: hud?.maxHp ?? 5 }, (_, i) => (
                <i key={i} className={i < (hud?.hp ?? 0) ? "on" : ""}>♥</i>
              ))}
            </span>
          </div>
          <span className="hud-pill" role="img" aria-label={`Lõi đã phá ${correct}/${total}, pha ${hud?.phase ?? 1}`}>
            <span className="hud-dots">
              {data.questions.map((_, i) => (
                <i key={i} className={answers[i] ? (answers[i].correct ? "ok" : "no") : ""} />
              ))}
            </span>
            <b>Pha {hud?.phase ?? 1}</b>
          </span>
          <button className="hud-pill" onClick={() => (engineRef.current?.setPaused(true), allDone ? finish() : setConfirmEnd(true))} style={{ cursor: "pointer" }}>
            {allDone ? "Xem kết quả ▶" : "Nộp bài"}
          </button>
        </div>
      )}

      {data && active === null && !allDone && !menu && !confirmEnd && (
        <div className="hud-help boss-help">
          {hud?.down ? (
            <>Em bị hạ gục — chờ chút để hồi sức nhé!</>
          ) : hud?.chip ? (
            <>Nhặt <b>Mảnh mã</b> 🟩 để trả lời câu hỏi và phá lõi boss!</>
          ) : (
            <>
              <span className="hint-keys">
                Đi: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / mũi tên · Đánh: <kbd>J</kbd> hoặc <kbd>Space</kbd> · Né: <kbd>K</kbd> hoặc <kbd>Shift</kbd> · Đánh trúng boss 3 lần khi khiên tắt để rơi Mảnh mã
              </span>
              <span className="hint-touch">Khiên xanh của boss tắt thì bấm ⚔️ 3 lần để rơi Mảnh mã · 💨 để né đòn</span>
            </>
          )}
        </div>
      )}

      {toast && <div className="hud-help" style={{ bottom: 64, background: "#4b3cccee" }}>{toast}</div>}

      {q && active !== null && (
        <QuestionCard
          q={q}
          index={active}
          total={total}
          ans={answers[active]}
          selected={selected}
          busy={busy}
          onSelect={setSelected}
          onSubmit={submit}
          onClose={closeCard}
          head={<div className="q-npc boss-chip-icon">🟩</div>}
          onLater={answerError ? () => router.push(`/world/${worldSlug}`) : undefined}
          laterLabel="Về bản đồ"
          closeLabel={answers[active]?.correct ? "Phá lõi! ⚔️" : "Đánh tiếp ▶"}
        />
      )}

      {allDone && active === null && (
        <div className="overlay">
          <div className="result-card">
            <h1 className="title-kid">{won ? "Boss sụp đổ! 🎉" : "Boss rút lui… 😤"}</h1>
            <p className="result-score" style={{ marginTop: 12 }}>Phá được {correct}/{total} lõi</p>
            <p className="muted">{won ? "Em đã gỡ hết lỗi của Tường lửa!" : `Cần phá ít nhất ${passMark(total)} lõi để hạ boss. Luyện thêm rồi quay lại nhé!`}</p>
            <div className="result-actions">
              <button className="btn btn-primary btn-lg" onClick={finish} disabled={finishing} autoFocus>
                {finishing ? "Đang tính sao…" : "Xem kết quả ▶"}
              </button>
            </div>
          </div>
        </div>
      )}

      {menu && (
        <div className="overlay">
          <div className="result-card">
            <h1 className="title-kid" style={{ fontSize: 30 }}>Tạm dừng</h1>
            <div className="result-actions">
              <Link href={`/world/${worldSlug}`} className="btn btn-light btn-lg">Về bản đồ</Link>
              <button className="btn btn-primary btn-lg" onClick={resume} autoFocus>Chơi tiếp ▶</button>
            </div>
          </div>
        </div>
      )}

      {confirmEnd && !allDone && (
        <div className="overlay">
          <div className="result-card">
            <h1 className="title-kid" style={{ fontSize: 30 }}>Nộp bài bây giờ?</h1>
            <p className="muted">Em mới trả lời {answers.length}/{total} câu. Những câu chưa trả lời sẽ tính là sai.</p>
            <div className="result-actions">
              <button className="btn btn-light btn-lg" onClick={resume}>Đánh tiếp</button>
              <button className="btn btn-primary btn-lg" onClick={finish} disabled={finishing}>{finishing ? "Đang nộp…" : "Nộp bài"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="dpad boss-dpad" aria-hidden>
        {DPAD.map((d) => (
          <button
            key={d.key}
            className={d.cls}
            tabIndex={-1}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); engineRef.current?.setKey(d.key, true); }}
            onPointerUp={() => engineRef.current?.setKey(d.key, false)}
            onPointerCancel={() => engineRef.current?.setKey(d.key, false)}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div className="boss-actions" aria-hidden>
        <button className="act-btn act-dash" tabIndex={-1} onPointerDown={() => engineRef.current?.setKey("dash", true)}>💨<span>Né</span></button>
        <button className="act-btn act-attack" tabIndex={-1} onPointerDown={() => engineRef.current?.setKey("attack", true)}>⚔️<span>Đánh</span></button>
      </div>
    </div>
  );
}
