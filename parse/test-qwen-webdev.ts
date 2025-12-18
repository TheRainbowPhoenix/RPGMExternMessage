// test-qwen-webdev.ts
// Simple smoke test against Qwen3 Coder WebDev Space using a harmless prompt.

const BASE_URL = "https://qwen-qwen3-coder-webdev.hf.space";
const PROMPT =
  "Build a minimal HTML page that shows the current weather in Beijing with placeholder data and basic styles.";
const POLL_RETRIES = 5;

async function fetchJob(path: string, data: unknown[]): Promise<
  string | Record<string, unknown>
> {
  const res = await fetch(`${BASE_URL}/gradio_api/call/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) {
    throw new Error(`Qwen request failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  if (json?.event_id) return json.event_id as string;
  return json;
}

async function pollJob(path: string, eventId: string): Promise<unknown> {
  for (let attempt = 1; attempt <= POLL_RETRIES; attempt++) {
    const res = await fetch(
      `${BASE_URL}/gradio_api/call/${path}/${eventId}`,
    );
    const body = await res.text();
    if (!res.ok) {
      throw new Error(`Qwen poll failed: ${res.status} ${body}`);
    }

    const objects = body.match(/\{[\s\S]*?\}/g) ?? [];
    for (const obj of objects) {
      try {
        const parsed = JSON.parse(obj);
        if (parsed?.data) return parsed.data;
      } catch {
        continue;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }

  throw new Error("Qwen poll stream ended without usable data after retries.");
}

async function runEndpoint(path: string, data: unknown[] = []): Promise<void> {
  const result = await fetchJob(path, data);
  if (typeof result === "string") {
    await pollJob(path, result);
  }
}

async function main() {
  // Warm-up endpoints expected by the space UI
  await runEndpoint("open_modal_3");
  await runEndpoint("lambda_4");

  const maybeEvent = await fetchJob("generate_code", [PROMPT, ""]);
  let payload: unknown;

  if (typeof maybeEvent === "string") {
    payload = await pollJob("generate_code", maybeEvent);
  } else if (Array.isArray((maybeEvent as { data?: unknown }).data)) {
    payload = (maybeEvent as { data: unknown[] }).data;
  } else {
    payload = maybeEvent;
  }

  const text = Array.isArray(payload) ? payload[0] : payload;
  console.log("\n--- Qwen WebDev response (first 500 chars) ---");
  console.log(String(text).slice(0, 500));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    Deno.exit(1);
  });
}
