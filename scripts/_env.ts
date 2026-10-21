// Loads .env.local / .env for the CLI scripts (Next.js does this itself for the app).
for (const f of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(f);
  } catch {
    /* file not present – fine */
  }
}
