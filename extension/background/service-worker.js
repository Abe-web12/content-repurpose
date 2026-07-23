// RepurposeAI Chrome Extension - Background Service Worker
// NOTE: MV3 service workers may terminate after ~30s of inactivity.
// The popup's active fetch chain keeps the SW alive during generation.
// If the popup closes, AbortController cancels in-flight requests.

// Single source of truth for app URL
const CONFIG = {
  APP_URL: "https://your-domain.com", // CHANGE THIS before deploy
  TIMEOUT_MS: 30000,
};

// Store config in chrome.storage for other scripts to read
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ appUrl: CONFIG.APP_URL });
});

// Message handlers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "GET_APP_URL":
      sendResponse({ url: CONFIG.APP_URL });
      return false;

    case "OPEN_POPUP":
      // Content script FAB was clicked: open the popup programmatically
      // Chrome doesn't allow programmatic popup open, so open the app in a new tab
      chrome.tabs.create({
        url: `${CONFIG.APP_URL}/generate?url=${encodeURIComponent(message.url)}`,
      });
      return false;

    case "EXTRACT_PAGE":
      handleExtraction(message.url)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;

    case "GENERATE_CONTENT":
      handleGeneration(message.content, message.format, message.voiceId)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;

    default:
      return false;
  }
});

function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);

  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timeout));
}

async function fetchWithRetry(url, options = {}, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);
      if (response.status >= 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return response;
    } catch (err) {
      if (err.name === "AbortError") {
        throw new Error("Request timed out. Check your connection and try again.");
      }
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

async function handleExtraction(url) {
  const response = await fetchWithRetry(`${CONFIG.APP_URL}/api/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ input: url, input_type: "blog_url" }),
  });

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Extraction failed (HTTP ${response.status})`);
  }

  return response.json();
}

async function handleGeneration(content, format, voiceId) {
  // Step 1: Analyze
  const analyzeResponse = await fetchWithRetry(`${CONFIG.APP_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ content, source_type: "article" }),
  });

  if (analyzeResponse.status === 401) throw new Error("UNAUTHORIZED");
  if (!analyzeResponse.ok) throw new Error("Content analysis failed. Please try again.");

  const analyzeData = await analyzeResponse.json();

  if (!analyzeData?.data?.analysis) {
    throw new Error("Analysis returned an unexpected response. Please try again.");
  }

  // Step 2: Generate (streaming)
  const generateResponse = await fetchWithTimeout(`${CONFIG.APP_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      content: analyzeData.data.analysis,
      output_format: format,
      voice_profile_id: voiceId || null,
    }),
  });

  if (generateResponse.status === 401) throw new Error("UNAUTHORIZED");
  if (generateResponse.status === 403) throw new Error("Generation limit reached. Upgrade your plan.");
  if (!generateResponse.ok) {
    const err = await generateResponse.json().catch(() => ({}));
    throw new Error(err.error || "Generation failed");
  }

  // Read SSE stream
  const reader = generateResponse.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;

      let parsed;
      try {
        parsed = JSON.parse(line.slice(6));
      } catch {
        continue; // Incomplete JSON chunk, skip
      }

      if (parsed.error) throw new Error(parsed.error);
      if (parsed.text) fullContent += parsed.text;
    }
  }

  if (!fullContent) throw new Error("Generation returned empty content.");

  return { content: fullContent };
}
