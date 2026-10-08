"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { buildCharacter } from "@/components/game/sprites";
import { SKINS, getSkin } from "@/lib/skins";
import { setSkin } from "./actions";

/** Ảnh nhân vật (đứng yên, nhìn thẳng) vẽ từ cùng bộ sprite với trong game. */
function Preview({ skinId, size }: { skinId: string; size: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(buildCharacter({ shirt: "#3b82f6", hair: "#2b1d16", skin: skinId }).down[0], 0, 0, c.width, c.height);
  }, [skinId]);
  return <canvas ref={ref} width={16 * 8} height={16 * 8} style={{ width: size, height: size, imageRendering: "pixelated" }} />;
}

export default function SkinPicker({ current }: { current: string }) {
  const [selected, setSelected] = useState(getSkin(current).id);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const skin = getSkin(selected);

  const choose = (id: string) => {
    if (id === selected || pending) return;
    const prev = selected;
    setSelected(id);
    setError(null);
    start(async () => {
      if (!(await setSkin(id))) {
        setSelected(prev);
        setError("Chưa lưu được trang phục, em thử lại nhé.");
      }
    });
  };

  return (
    <div className="skins-wrap">
      <aside className="skin-hero" style={{ ["--sk" as string]: skin.pal.a }}>
        <Preview skinId={selected} size={192} />
        <h2 className="title-kid">{skin.emoji} {skin.name}</h2>
        <p className="muted-light">{skin.tagline}</p>
        {error && <p role="alert" style={{ color: "#ff9a9a" }}>{error}</p>}
      </aside>
      <div className="skin-grid" role="radiogroup" aria-label="Trang phục">
        {SKINS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={s.id === selected}
            className={`skin-card ${s.id === selected ? "on" : ""}`}
            style={{ ["--sk" as string]: s.pal.a }}
            onClick={() => choose(s.id)}
          >
            <Preview skinId={s.id} size={80} />
            <span>{s.name}</span>
            {s.id === selected && <i className="skin-tick">✓</i>}
          </button>
        ))}
      </div>
    </div>
  );
}
