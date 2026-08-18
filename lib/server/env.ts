import "server-only";

function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(
      `Missing required environment variable: ${name}. See PHASE2.md for setup.`,
    );
  }
  return value;
}

export const env = {
  get postgresUrl(): string {
    return required(
      "POSTGRES_URL",
      process.env.POSTGRES_URL ?? process.env.POSTGRES_PRISMA_URL,
    );
  },
  get sessionSecret(): string {
    return required("SESSION_SECRET", process.env.SESSION_SECRET);
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
};
