import { FeatherMark } from "./icons";

export default function Logo({ small }) {
  return (
    <span className="brand-row" style={small ? { padding: 0 } : {}}>
      <span
        className="logo-mark sm"
        style={small ? { width: 30, height: 30, borderRadius: 9 } : {}}
      >
        <FeatherMark size={17} />
      </span>
      {!small && (
        <span>
          <span className="brand-name">
            Daily <b>Life</b> Review
          </span>
        </span>
      )}
      {small && (
        <span className="brand-name" style={{ fontSize: 15, fontWeight: 700 }}>
          Daily <b style={{
            background: "var(--grad)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}>Life</b>
        </span>
      )}
    </span>
  );
}
