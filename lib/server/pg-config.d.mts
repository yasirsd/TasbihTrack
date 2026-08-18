export function loadSupabaseCa(): string;
export function sanitizeConnectionString(url: string): string;
export function buildPgConfig(url: string): {
  connectionString: string;
  ssl: { ca: string };
};
