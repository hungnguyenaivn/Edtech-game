"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Stars from "@/components/Stars";
import { OverworldEngine, STOP_COLORS, type StationInfo, buildOverworld } from "./overworld";

export type MapLevel = StationInfo & { id: string; plays: number; bestCorrect: number };

const DPAD: { cls: string; key: string; label: string }[] = [
  { cls: "up", key: "arrowup", label: "▲" },
  { cls: "left", key: "arrowleft", label: "◀" },
  { cls: "right", key: "arrowright", label: "▶" },
  { cls: "down", key: "arrowdown", label: "▼" },
];

/** Bản đồ thế giới 2.5D (isometric, có đồi dốc): nhân vật của em tự đi bộ lên xuống tới từng ngôi nhà level. */
export default function WorldMap({ slug, avatarColor, levels, questionsPerLevel }: { slug: string; avatarColor: string; levels: MapLevel[]; questionsPerLevel: number }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<OverworldEngine | null>(null);
  const [near, setNear] = useState<number | null>(null);
  const [entering, setEntering] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const levelsRef = useRef(levels);
  levelsRef.current = levels;
  const currentIdx = levels.findIndex((l) => l.current);
  const allPassed = levels.length > 0 && levels.every((l) => l.passed);

  useEffect(() => {
    if (!canvasRef.current) return;
    const lv = levelsRef.current;
    const map = buildOverworld(slug, lv.length);
    const cur = lv.findIndex((l) => l.current);
    const engine = new OverworldEngine(canvasRef.current, map, lv, lv.length > 0 && lv.every((l) => l.passed), avatarColor, cur >= 0 ? cur : lv.length, {
      onNear: setNear,
      onEnter: (i) => {
        const l = levelsRef.current[i];
        if (!l) setToast(allPassedRef.current ? "Em đã mở hết kho báu rồi! 🏆" : "Qua hết các level để mở kho báu nhé!");
        else if (!l.unlocked) setToast(`Qua level ${l.number - 1} để mở nhà này nhé 🔒`);
        else {
          engineRef.current?.setPaused(true);
          setEntering(true);
          router.push(`/play/${l.id}`);
        }
      },
    });
    engineRef.current = engine;
    engine.start();
    if (new URLSearchParams(window.location.search).has("e2e")) (window as unknown as { __vtMap: OverworldEngine }).__vtMap = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [slug, avatarColor, router]);

  const allPassedRef = useRef(allPassed);
  allPassedRef.current = allPassed;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const nearLevel = near !== null ? levels[near] : null;
  const enter = () => near !== null && engineRef.current && levels[near]?.unlocked && (engineRef.current.setPaused(true), setEntering(true), router.push(`/play/${levels[near].id}`));

  return (
    <div className="worldmap">
      <canvas ref={canvasRef} />
      <div className="wm-top">
        <span className="wm-hint">Dùng ← ↑ ↓ → hoặc chạm để đi, leo dốc lên đồi · Nhấn E để vào nhà</span>
        {currentIdx >= 0 && (
          <button className="btn btn-primary" onClick={() => engineRef.current?.walkTo(currentIdx)}>📍 Tới level của em</button>
        )}
      </div>

      {nearLevel ? (
        <div className={`wm-card ${nearLevel.unlocked ? "" : "locked"}`}>
          <span className="wm-num" style={{ background: nearLevel.unlocked ? STOP_COLORS[near! % STOP_COLORS.length] : "#8b8fb0" }}>{nearLevel.unlocked ? nearLevel.number : "🔒"}</span>
          <div className="wm-body">
            <h3>Level {nearLevel.number} · {nearLevel.title}</h3>
            {nearLevel.unlocked ? (
              <p>
                <Stars n={nearLevel.stars} size={16} />{" "}
                {nearLevel.plays === 0 ? `${questionsPerLevel} câu hỏi đang đợi em` : `Tốt nhất ${nearLevel.bestCorrect}/${questionsPerLevel} câu đúng`}
              </p>
            ) : (
              <p>Qua level {nearLevel.number - 1} để mở nhà này nhé</p>
            )}
          </div>
          {nearLevel.unlocked && (
            <button className="btn btn-primary" onClick={enter} disabled={entering}>{nearLevel.plays === 0 ? "Vào chơi ▶" : "Chơi lại ↻"}</button>
          )}
        </div>
      ) : (
        near !== null && (
          <div className="wm-card">
            <span className="wm-num" style={{ background: "var(--star)" }}>{allPassed ? "🏆" : "🎁"}</span>
            <div className="wm-body">
              <h3>{allPassed ? "Em là nhà vô địch!" : "Kho báu đang đợi"}</h3>
              <p>{allPassed ? "Em đã qua tất cả các level của hành tinh này." : "Qua hết các level để mở kho báu nhé!"}</p>
            </div>
          </div>
        )
      )}

      {toast && <div className="wm-hint" style={{ position: "absolute", left: "50%", top: 64, transform: "translateX(-50%)", background: "#ef5a5af0" }}>{toast}</div>}

      <div className="dpad" aria-hidden>
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

      {entering && (
        <div className="overlay" style={{ background: "#151a3dcc" }}>
          <p className="title-kid" style={{ color: "#fff", fontSize: 28 }}>Đang vào level…</p>
        </div>
      )}
    </div>
  );
}
