/** Hành tinh vẽ bằng SVG: mỗi thế giới có bề mặt riêng, chung một kiểu chiếu sáng (sáng phía trên-trái). */
export default function Planet({ slug, color, size = 170 }: { slug: string; color: string; size?: number }) {
  const id = `pl-${slug}`;
  return (
    <div className="planet" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" aria-hidden>
        <defs>
          <clipPath id={`${id}-c`}>
            <circle cx="100" cy="100" r="68" />
          </clipPath>
          {/* bóng đổ phía tối của quả cầu */}
          <radialGradient id={`${id}-shade`} cx="32%" cy="28%" r="85%">
            <stop offset="0%" stopColor="#000" stopOpacity="0" />
            <stop offset="55%" stopColor="#000" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#050719" stopOpacity="0.78" />
          </radialGradient>
          {/* khí quyển phát sáng ở rìa */}
          <radialGradient id={`${id}-atmo`} cx="50%" cy="50%" r="50%">
            <stop offset="86%" stopColor={color} stopOpacity="0" />
            <stop offset="100%" stopColor={color} stopOpacity="0.5" />
          </radialGradient>
          <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-spec`} cx="30%" cy="26%" r="30%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-ring`} x1="0" x2="1">
            <stop offset="0%" stopColor="#f6d9a0" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#ffe6b3" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#f6d9a0" stopOpacity="0.15" />
          </linearGradient>
          <PlanetBase slug={slug} id={id} />
        </defs>

        <circle cx="100" cy="100" r="92" fill={`url(#${id}-glow)`} />
        {slug === "toan-ly-hoa" && <RingBack id={id} />}

        <g clipPath={`url(#${id}-c)`}>
          <circle cx="100" cy="100" r="68" fill={`url(#${id}-base)`} />
          <Surface slug={slug} />
          <circle cx="100" cy="100" r="68" fill={`url(#${id}-shade)`} />
          <circle cx="100" cy="100" r="68" fill={`url(#${id}-spec)`} />
        </g>
        <circle cx="100" cy="100" r="68" fill={`url(#${id}-atmo)`} />

        {slug === "toan-ly-hoa" && <RingFront id={id} />}
        {slug !== "toan-ly-hoa" && <Moon slug={slug} />}
      </svg>
    </div>
  );
}

function PlanetBase({ slug, id }: { slug: string; id: string }) {
  const stops =
    slug === "ai-cong-nghe"
      ? ["#8f84ff", "#4a3fc4", "#1c1760"]
      : slug === "toan-ly-hoa"
        ? ["#ffc27a", "#e8782a", "#7a3414"]
        : ["#5fe0c4", "#1b8f9c", "#0b3a5e"];
  return (
    <radialGradient id={`${id}-base`} cx="32%" cy="28%" r="80%">
      <stop offset="0%" stopColor={stops[0]} />
      <stop offset="55%" stopColor={stops[1]} />
      <stop offset="100%" stopColor={stops[2]} />
    </radialGradient>
  );
}

function Surface({ slug }: { slug: string }) {
  if (slug === "ai-cong-nghe") {
    // hành tinh "mạch điện": đường vĩ tuyến phát sáng + đèn thành phố
    return (
      <g>
        <g fill="none" stroke="#b9b2ff" strokeWidth="1.4" opacity="0.4">
          <ellipse cx="100" cy="100" rx="68" ry="22" />
          <ellipse cx="100" cy="100" rx="68" ry="46" />
          <ellipse cx="100" cy="100" rx="24" ry="68" />
          <ellipse cx="100" cy="100" rx="50" ry="68" />
        </g>
        <path d="M52 118h22l10-14h26l8 10h24" fill="none" stroke="#d7d2ff" strokeWidth="2" strokeLinejoin="round" opacity="0.75" />
        <path d="M70 80h16l8-10h28" fill="none" stroke="#d7d2ff" strokeWidth="2" strokeLinejoin="round" opacity="0.55" />
        <g fill="#fff">
          <circle cx="74" cy="118" r="2.6" opacity="0.95" />
          <circle cx="110" cy="104" r="2.6" opacity="0.95" />
          <circle cx="142" cy="118" r="2.2" opacity="0.8" />
          <circle cx="94" cy="70" r="2.4" opacity="0.85" />
          <circle cx="122" cy="70" r="2" opacity="0.7" />
          <circle cx="86" cy="142" r="1.8" opacity="0.6" />
          <circle cx="124" cy="138" r="1.8" opacity="0.6" />
        </g>
      </g>
    );
  }
  if (slug === "toan-ly-hoa") {
    // hành tinh khí: các dải mây và một cơn bão
    return (
      <g>
        <g opacity="0.55">
          <path d="M20 58q40 -8 80 0t80 -2v16q-40 8 -80 0t-80 2z" fill="#fff0cf" />
          <path d="M20 92q40 8 80 0t80 4v14q-40 -6 -80 2t-80 -4z" fill="#8a3b12" />
          <path d="M20 124q40 -8 80 0t80 -2v18q-40 6 -80 0t-80 2z" fill="#ffe0a8" />
          <path d="M20 152q40 6 80 0t80 2v12H20z" fill="#9c4a1a" />
        </g>
        <ellipse cx="128" cy="112" rx="15" ry="8" fill="#b4401a" opacity="0.85" />
        <ellipse cx="128" cy="112" rx="8" ry="3.6" fill="#ffd0a0" opacity="0.7" />
      </g>
    );
  }
  // tieng-anh: đại dương, lục địa, mây
  return (
    <g>
      <path d="M52 78c8-14 26-16 34-8s6 18-4 24-10 16-22 14-18-18-8-30z" fill="#58c26b" opacity="0.92" />
      <path d="M52 78c8-14 26-16 34-8s6 18-4 24" fill="none" stroke="#e8e2a8" strokeWidth="2" opacity="0.7" />
      <path d="M108 114c10-10 30-8 36 2s0 22-12 26-16 12-24 4-8-22 0-32z" fill="#4eb86a" opacity="0.92" />
      <path d="M124 52c8-6 20-4 22 4s-8 12-16 10-12-6-6-14z" fill="#58c26b" opacity="0.85" />
      <g fill="#fff" opacity="0.7">
        <path d="M30 108c14-8 30-6 44 0s24 2 34-4c-6 10-22 14-38 12s-30 4-40-8z" />
        <path d="M100 62c14-6 34-4 52 6-14 0-26 6-40 4s-10-6-12-10z" />
        <path d="M60 150c14-6 34-2 50 4-14 6-34 8-50-4z" opacity="0.8" />
      </g>
    </g>
  );
}

function RingBack({ id }: { id: string }) {
  return (
    <ellipse cx="100" cy="104" rx="96" ry="24" fill="none" stroke={`url(#${id}-ring)`} strokeWidth="9" opacity="0.55" transform="rotate(-18 100 104)" />
  );
}

/** Nửa trước của vành đai, chỉ vẽ phần đi ngang qua trước quả cầu. */
function RingFront({ id }: { id: string }) {
  return (
    <path
      d="M 4 104 A 96 24 0 0 0 196 104"
      transform="rotate(-18 100 104)"
      fill="none"
      stroke={`url(#${id}-ring)`}
      strokeWidth="9"
      strokeLinecap="round"
    />
  );
}

function Moon({ slug }: { slug: string }) {
  const [cx, cy, r] = slug === "ai-cong-nghe" ? [160, 48, 11] : [38, 156, 9];
  return (
    <g>
      <defs>
        <radialGradient id="moon-shade" cx="30%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0a0c28" stopOpacity="0.7" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="#c9c6df" />
      <circle cx={cx} cy={cy} r={r} fill="url(#moon-shade)" />
      <circle cx={cx - r * 0.3} cy={cy + r * 0.2} r={r * 0.22} fill="#9d9ab8" opacity="0.7" />
      <circle cx={cx + r * 0.35} cy={cy - r * 0.3} r={r * 0.15} fill="#9d9ab8" opacity="0.7" />
    </g>
  );
}
