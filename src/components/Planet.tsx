/** Hành tinh vẽ bằng SVG (tạm thay cho hình từ Figma). */
export default function Planet({ slug, color, size = 170 }: { slug: string; color: string; size?: number }) {
  const gid = `pg-${slug}`;
  return (
    <div className="planet" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" aria-hidden>
        <defs>
          <radialGradient id={gid} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="18%" stopColor={color} stopOpacity="0.95" />
            <stop offset="100%" stopColor="#10143a" />
          </radialGradient>
          <clipPath id={`${gid}-c`}>
            <circle cx="100" cy="100" r="70" />
          </clipPath>
        </defs>
        <circle cx="100" cy="100" r="86" fill={color} opacity="0.16" />
        {/* nửa sau vành đai */}
        <ellipse cx="100" cy="104" rx="98" ry="24" fill="none" stroke="#ffd36e" strokeWidth="7" opacity="0.45" transform="rotate(-16 100 104)" />
        <circle cx="100" cy="100" r="70" fill={`url(#${gid})`} />
        <g clipPath={`url(#${gid}-c)`} opacity="0.22" fill="#fff">
          {slug === "tieng-anh" ? (
            <>
              <rect x="20" y="70" width="160" height="10" />
              <rect x="20" y="104" width="160" height="16" />
              <rect x="20" y="140" width="160" height="7" />
            </>
          ) : (
            <>
              <circle cx="70" cy="130" r="12" />
              <circle cx="135" cy="80" r="8" />
              <circle cx="130" cy="140" r="16" />
            </>
          )}
        </g>
        <PlanetIcon slug={slug} />
        {/* nửa trước vành đai */}
        <path d="M 2 104 A 98 24 0 0 0 198 104" transform="rotate(-16 100 104)" fill="none" stroke="#ffd36e" strokeWidth="7" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function PlanetIcon({ slug }: { slug: string }) {
  const s = { fill: "none", stroke: "#fff", strokeWidth: 7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (slug === "ai-cong-nghe")
    return (
      <g {...s}>
        <rect x="78" y="78" width="44" height="44" rx="8" />
        <path d="M90 78v-12M110 78v-12M90 134v-12M110 134v-12M78 90h-12M78 110h-12M134 90h-12M134 110h-12" strokeWidth="5" />
        <circle cx="100" cy="100" r="6" fill="#fff" stroke="none" />
      </g>
    );
  if (slug === "toan-ly-hoa")
    return (
      <g {...s}>
        <path d="M88 68h24M93 68v22l-20 34a6 6 0 0 0 5 9h44a6 6 0 0 0 5-9l-20-34V68" />
        <path d="M80 114h40" strokeWidth="5" />
      </g>
    );
  return (
    <text x="100" y="116" textAnchor="middle" fontFamily="Baloo 2, sans-serif" fontWeight="800" fontSize="46" fill="#fff">
      ABC
    </text>
  );
}
