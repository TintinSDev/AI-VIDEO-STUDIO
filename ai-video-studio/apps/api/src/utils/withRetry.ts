export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 2000
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;

    console.warn(
      `🔁 Retrying (${retries} left)…`,
      err instanceof Error ? err.message : err
    );

    // small delay to avoid hammering provider
    await new Promise((res) => setTimeout(res, delayMs));

    return withRetry(fn, retries - 1, delayMs);
  }
}
