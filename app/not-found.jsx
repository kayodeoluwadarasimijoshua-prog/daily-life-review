import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, textAlign: "center",
    }}>
      <div>
        <div style={{
          width: 64, height: 64, margin: "0 auto 20px", borderRadius: 16,
          display: "grid", placeItems: "center",
          background: "var(--surface-3)", color: "var(--ink-3)", fontSize: 28,
        }}>
          📄
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Page not found</h1>
        <p style={{ color: "var(--ink-2)", fontSize: 14, lineHeight: 1.6, maxWidth: 360, margin: "0 auto 24px" }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/" className="btn btn-primary">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
