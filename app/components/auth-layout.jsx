import { FeatherMark } from "./icons";
import { IconSparkle, IconPen, IconTrend, IconShield } from "./icons";

export function AuthVisual() {
  return (
    <div className="auth-visual">
      <div>
        <span className="auth-brand" style={{ color: "#fff" }}>
          <span style={{ background: "rgba(255,255,255,0.2)", width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center" }}>
            <FeatherMark size={21} />
          </span>
          Daily Life Review
        </span>
      </div>
      <div>
        <p className="quote">
          “Write a few honest lines a day. The little patterns your mind is too busy to notice become clarity about how you're really doing.”
        </p>
        <small style={{ display: "block", fontWeight: 500, opacity: 0.85, fontSize: 13, marginTop: 16, position: "relative", zIndex: 1 }}>
          — your future self, looking back with kindness
        </small>
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="grid" style={{ gap: 10 }}>
          {[
            { i: <IconPen size={16} />, t: "A notepad for everyday moments" },
            { i: <IconSparkle size={16} />, t: "AI turns your week into clear insights" },
            { i: <IconTrend size={16} />, t: "Mood trends, themes, wins & gentle nudges" },
            { i: <IconShield size={16} />, t: "Your data stays private, on your device" },
          ].map((f, idx) => (
            <div key={idx} className="flex gap10" style={{ opacity: 0.95 }}>
              <span style={{ background: "rgba(255,255,255,0.18)", width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", flex: "0 0 auto" }}>{f.i}</span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{f.t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DemoPill({ email, password, onFill }) {
  return (
    <div className="demo-pill" onClick={onFill} role="button" style={{ cursor: "pointer" }}>
      <span>✨</span>
      <span style={{ fontSize: 13 }}>
        <strong>Try the demo:</strong> <span style={{ fontFamily: "monospace" }}>{email}</span>
      </span>
      <span style={{ border: "1px solid rgba(255,255,255,0.4)", borderRadius: 6, padding: "1px 7px", fontFamily: "monospace" }}>{password}</span>
      <span style={{ fontSize: 11, opacity: 0.85 }}>— tap to fill</span>
    </div>
  );
}
