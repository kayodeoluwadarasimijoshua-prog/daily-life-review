import { FeatherMark } from "./icons";

export default function Logo({ small }) {
  return (
    <span className="brand-row" style={small ? { padding: 0 } : {}}>
      <span className="logo-mark sm" style={small ? { width: 30, height: 30, borderRadius: 9 } : {}}>
        <FeatherMark size={17} />
      </span>
      <span>
        <span className="brand-name" style={small ? { fontSize: 15 } : {}}>
          Daily <b>Life</b> Review
        </span>
      </span>
    </span>
  );
}
