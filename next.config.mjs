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
    return [
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
