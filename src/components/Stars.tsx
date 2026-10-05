export default function Stars({ n, size }: { n: number; size?: number }) {
  return (
    <span className="stars" style={size ? { fontSize: size } : undefined} aria-label={`${n} sao`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={`s ${i < n ? "on" : ""}`}>★</span>
      ))}
    </span>
  );
}
