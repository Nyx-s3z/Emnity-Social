const URL = "https://emnity-social-production.up.railway.app/";

const USERS = 5;
const DURATION_MS = 15_000;
const PAUSE_MS = 3_000;

const results = [];

async function virtualUser(id) {
  const end = Date.now() + DURATION_MS;

  while (Date.now() < end) {
    const start = performance.now();

    try {
      const response = await fetch(URL, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(10000)
      });

      results.push({
        user: id,
        status: response.status,
        ms: performance.now() - start
      });

      await response.arrayBuffer();
    } catch (error) {
      results.push({
        user: id,
        status: "FAILED",
        ms: performance.now() - start
      });
    }

    await new Promise(resolve => setTimeout(resolve, PAUSE_MS));
  }
}

async function main() {
  console.log(`Starting ${USERS} simulated visitors...`);

  await Promise.all(
    Array.from({ length: USERS }, (_, i) => virtualUser(i + 1))
  );

  const times = results
    .filter(r => r.status === 200)
    .map(r => r.ms)
    .sort((a, b) => a - b);

  const successful = times.length;
  const failed = results.length - successful;

  console.log("\n===== TEST RESULTS =====");
  console.log("Total requests:", results.length);
  console.log("Successful:", successful);
  console.log("Failed/non-200:", failed);

  if (successful) {
    console.log("Average response:", 
      (times.reduce((a, b) => a + b, 0) / successful).toFixed(0), "ms");

    console.log("Slowest response:", times[times.length - 1].toFixed(0), "ms");
    console.log("Approx. p95:", times[Math.ceil(times.length * 0.95) - 1].toFixed(0), "ms");
  }
}

main();
