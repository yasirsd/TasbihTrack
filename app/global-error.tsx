"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "3rem 1.5rem", textAlign: "center", background: "#09090B", color: "#F4F4F4", minHeight: "100dvh" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>1011 Tracker is having trouble loading.</h1>
        <p style={{ marginTop: "0.5rem", color: "#a1a1aa" }}>Your data is safe. Please try again.</p>
        <button
          onClick={reset}
          style={{
            marginTop: "1.5rem",
            padding: "0.75rem 1.25rem",
            borderRadius: "9999px",
            background: "#EF233C",
            color: "white",
            border: "none",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
