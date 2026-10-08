/** Trang phục nhân vật (chủ đề chiến binh) — dữ liệu dùng chung cho server và giao diện. */

export type Helm = "open" | "cheek" | "visor" | "mask";
export type Armor = "plate" | "cloth";

export type Skin = {
  id: string;
  name: string;
  tagline: string;
  emoji: string;
  /** màu áo / quần / giày */
  shirt: string;
  pants: string;
  boots: string;
  /** bảng màu mũ & giáp: a = chính, b = tối, c = nhấn, d = sáng, f = viền mũ */
  pal: { a: string; b: string; c: string; d: string; f: string };
  helm: Helm;
  armor: Armor;
  /** 5 hàng trên cùng của mũ (hàng 0–4), dùng chung cho mọi hướng */
  top: string[];
};

export const SKINS: Skin[] = [
  {
    id: "spartan", name: "Spartan", tagline: "Chiến binh Sparta, mũ đồng lông đỏ", emoji: "🛡️",
    shirt: "#b3262c", pants: "#b3262c", boots: "#7a4a22",
    pal: { a: "#cd8f3d", b: "#8a5a1f", c: "#d9363e", d: "#f2c46d", f: "#cd8f3d" },
    helm: "cheek", armor: "plate",
    top: ["......cccc......", ".....kccccck....", "....kaaaaaak....", "...kaaadaaaak...", "...kaaaaaaaak..."],
  },
  {
    id: "viking", name: "Viking", tagline: "Dũng sĩ phương Bắc, mũ sừng", emoji: "🪓",
    shirt: "#7a4a2b", pants: "#4a3a2a", boots: "#3a2618",
    pal: { a: "#9aa3b5", b: "#59627a", c: "#c9d2e6", d: "#f4efe0", f: "#9aa3b5" },
    helm: "open", armor: "plate",
    top: ["..d..........d..", ".dd..kkkkkk..dd.", ".dd.kaaaaaak.dd.", "..dkaaaaaaaakd..", "...kbbbbbbbbk..."],
  },
  {
    id: "samurai", name: "Samurai", tagline: "Võ sĩ đạo, mũ kabuto vàng", emoji: "⚔️",
    shirt: "#c4343a", pants: "#2a2f55", boots: "#2a2230",
    pal: { a: "#2b3563", b: "#1b2142", c: "#f2c230", d: "#5666a8", f: "#2b3563" },
    helm: "open", armor: "plate",
    top: ["..c....cc....c..", "...c.kkkkkk.c...", "....kaaaaaak....", "...kaaaccaaak...", "...kbbbbbbbbk..."],
  },
  {
    id: "roman", name: "Lê dương La Mã", tagline: "Quân đoàn La Mã, mũ lông ngựa", emoji: "🏛️",
    shirt: "#c23b3b", pants: "#a63030", boots: "#6b4226",
    pal: { a: "#b9b9c4", b: "#7d7d8c", c: "#d93a3a", d: "#ececf5", f: "#b9b9c4" },
    helm: "cheek", armor: "plate",
    top: ["....cccccccc....", "...ckkkkkkkkc...", "....kaaaaaak....", "...kaaaaaaaak...", "...kbbbbbbbbk..."],
  },
  {
    id: "knight", name: "Hiệp sĩ", tagline: "Hiệp sĩ trung cổ, giáp bạc", emoji: "🏰",
    shirt: "#8f9bb3", pants: "#6c7894", boots: "#444b5e",
    pal: { a: "#aeb8cc", b: "#6c7894", c: "#3b6fe0", d: "#eef2fb", f: "#aeb8cc" },
    helm: "visor", armor: "plate",
    top: [".......cc.......", ".....kkcckk.....", "....kaaaaaak....", "...kaaadaaak....", "...kaaaaaaaak..."],
  },
  {
    id: "mongol", name: "Kỵ binh Mông Cổ", tagline: "Thảo nguyên rộng lớn, mũ lông", emoji: "🏹",
    shirt: "#2f6f8f", pants: "#3b4f6b", boots: "#5a3a22",
    pal: { a: "#3f7f9f", b: "#27526a", c: "#7a4a2b", d: "#a8693f", f: "#7a4a2b" },
    helm: "open", armor: "cloth",
    top: [".......dd.......", "....kaaaaaak....", "...kaaaaaaaak...", "..kccccccccccck.", "..kcccccccccck.."],
  },
  {
    id: "ninja", name: "Ninja", tagline: "Bóng đêm im lặng, băng đô đỏ", emoji: "🥷",
    shirt: "#272a3a", pants: "#272a3a", boots: "#14151f",
    pal: { a: "#2f3347", b: "#1b1d2b", c: "#e03a3a", d: "#4a5070", f: "#2f3347" },
    helm: "mask", armor: "cloth",
    top: ["................", ".....kkkkkk.....", "....kaaaaaak....", "...kaaaaaaaak...", "...kccccccck...."],
  },
  {
    id: "aztec", name: "Chiến binh Báo đốm", tagline: "Đế chế Aztec, mũ lông vũ", emoji: "🐆",
    shirt: "#d98324", pants: "#a8601a", boots: "#6b3d14",
    pal: { a: "#e8962a", b: "#2fa37a", c: "#e04a6a", d: "#ffd23f", f: "#e8962a" },
    helm: "open", armor: "cloth",
    top: ["..b.c.dd.c.b....", "...bcckkkkccb...", "....kaaaaaak....", "...kaakaakaak...", "...kakaaaakak..."],
  },
  {
    id: "pharaoh", name: "Vệ binh Pharaoh", tagline: "Ai Cập cổ đại, khăn vàng xanh", emoji: "🔱",
    shirt: "#f2e6c4", pants: "#f2e6c4", boots: "#b88a3a",
    pal: { a: "#e6b422", b: "#9a7410", c: "#2a5fd0", d: "#fff0a0", f: "#e6b422" },
    helm: "open", armor: "cloth",
    top: ["................", "....kaaaaaak....", "...kaccaccaak...", "..kaccaccaccak..", "..kaccaccaccak.."],
  },
  {
    id: "soldier", name: "Biệt kích", tagline: "Lính đặc nhiệm, ngụy trang rằn ri", emoji: "🎖️",
    shirt: "#5a6b3a", pants: "#4a5a30", boots: "#2e2a20",
    pal: { a: "#6b7d45", b: "#3f4d28", c: "#c9b458", d: "#8fa05f", f: "#6b7d45" },
    helm: "open", armor: "plate",
    top: ["................", "....kaaaaaak....", "...kaaaaaaaak...", "..kaabaaabaaak..", "..kaaaaaaaaaak.."],
  },
];

export const DEFAULT_SKIN = SKINS[0].id;

export function getSkin(id: string | null | undefined): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
export function isSkinId(id: string): boolean {
  return SKINS.some((s) => s.id === id);
}
