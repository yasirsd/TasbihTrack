/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // NOTE: `motion` intentionally omitted. Next 15's optimizePackageImports
    // barrel-rewrites imports from "motion/react" into deep paths that the
    // dev webpack chunker occasionally fails to re-emit after HMR, producing
    // `Cannot find module './vendor-chunks/motion.js'` at runtime. Motion's
    // own bundle is small enough that this optimization is not worth the
    // stability cost. `lucide-react` remains — it is well-supported here.
    optimizePackageImports: ["lucide-react"],
  },
  // Ensure the Supabase CA certificate is bundled into serverless functions
  // that touch the database (Server Actions live under /app).
  outputFileTracingIncludes: {
    "/**/*": ["./certs/**/*"],
  },
  async headers() {
    // Baseline hardening applied to every response. We intentionally do NOT
    // ship a Content-Security-Policy here — Next 15 injects inline scripts
    // for the RSC bootstrap and hydration payloads, so a naive CSP would
    // break the app. `X-Frame-Options: DENY` + `Referrer-Policy` +
    // `X-Content-Type-Options` + a minimal `Permissions-Policy` cover the
    // highest-value protections (clickjacking, referrer leaks, MIME
    // sniffing, incidental sensor access) without breaking anything.
    const baseline = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
      },
    ];
    return [
      {
        source: "/:path*",
        headers: baseline,
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
