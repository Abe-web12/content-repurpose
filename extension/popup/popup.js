// RepurposeAI Chrome Extension Popup

let selectedFormat = "linkedin_post";
let currentPageUrl = "";
let generatedContent = "";
let abortController = null;

// Get APP_URL from storage (set by service worker on install)
let APP_URL = "http://localhost:3000";

// DOM elements
const statusEl = document.getElementById("status");
const generateBtn = document.getElementById("generate-btn");
const outputEl = document.getElementById("output");
const copyBtn = document.getElementById("copy-btn");
const cancelBtn = document.getElementById("cancel-btn");
const mainContent = document.getElementById("main-content");
const loginPrompt = document.getElementById("login-prompt");
const loginLink = document.getElementById("login-link");

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  // Load app URL from storage
  const stored = await chrome.storage.local.get("appUrl");
  if (stored.appUrl) APP_URL = stored.appUrl;
  loginLink.href = `${APP_URL}/login`;

  // Get current tab URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentPageUrl = tab?.url || "";

  if (currentPageUrl && !currentPageUrl.startsWith("chrome://") && !currentPageUrl.startsWith("about:")) {
    const domain = new URL(currentPageUrl).hostname;
    setStatus(`Ready to repurpose content from ${domain}`, "info");
  } else {
    setStatus("Navigate to an article to repurpose it.", "info");
    generateBtn.disabled = true;
  }

  // Format buttons
  document.querySelectorAll(".format-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".format-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedFormat = btn.dataset.format;
    });
  });

  generateBtn.addEventListener("click", handleGenerate);
  copyBtn.addEventListener("click", handleCopy);
  cancelBtn.addEventListener("click", handleCancel);
});

function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  return fetch(url, { ...options, signal: abortController.signal })
    .finally(() => clearTimeout(timeout));
}

async function handleGenerate() {
  if (!currentPageUrl || currentPageUrl.startsWith("chrome://")) {
    setStatus("Navigate to a web page first.", "error");
    return;
  }

  setStatus("Extracting content...", "loading");
  generateBtn.disabled = true;
  generateBtn.innerHTML = '<span class="spinner"></span>Working...';
  cancelBtn.classList.remove("hidden");
  outputEl.classList.remove("visible");
  copyBtn.classList.remove("visible");

  try {
    // Step 1: Extract
    const extractResponse = await fetchWithTimeout(`${APP_URL}/api/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ input: currentPageUrl, input_type: "blog_url" }),
    });

    if (extractResponse.status === 401) {
      showLoginPrompt();
      return;
    }

    if (!extractResponse.ok) {
      const err = await extractResponse.json().catch(() => ({}));
      throw new Error(err.error || "Failed to extract content from this page.");
    }

    const extractData = await extractResponse.json();

    if (!extractData?.data?.content) {
      throw new Error("Could not extract content from this page. Try a different article.");
    }

    setStatus("Analyzing content...", "loading");

    // Step 2: Analyze
    const analyzeResponse = await fetchWithTimeout(`${APP_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        content: extractData.data.content,
        source_type: "article",
      }),
    });

    if (analyzeResponse.status === 401) {
      showLoginPrompt();
      return;
    }

    if (!analyzeResponse.ok) throw new Error("Content analysis failed. Try again.");

    const analyzeData = await analyzeResponse.json();

    if (!analyzeData?.data?.analysis) {
      throw new Error("Content analysis returned empty. Try again.");
    }

    setStatus("Generating content...", "loading");

    // Step 3: Generate (streaming)
    const generateResponse = await fetchWithTimeout(`${APP_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        content: analyzeData.data.analysis,
        output_format: selectedFormat,
        voice_profile_id: null,
      }),
    }, 60000); // Longer timeout for generation

    if (generateResponse.status === 401) {
      showLoginPrompt();
      return;
    }

    if (generateResponse.status === 403) {
      throw new Error("Generation limit reached. Upgrade your plan at repurpose.ai");
    }

    if (!generateResponse.ok) {
      const err = await generateResponse.json().catch(() => ({}));
      throw new Error(err.error || "Generation failed.");
    }

    // Read stream
    const reader = generateResponse.body.getReader();
    const decoder = new TextDecoder();
    generatedContent = "";
    outputEl.textContent = "";
    outputEl.classList.add("visible");

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
          continue; // Incomplete chunk, skip
        }

        if (parsed.error) throw new Error(parsed.error);
        if (parsed.text) {
          generatedContent += parsed.text;
          outputEl.textContent = generatedContent;
        }
      }
    }

    if (!generatedContent) throw new Error("Generation returned empty. Try a different page.");

    setStatus("Done! Content ready.", "success");
    copyBtn.classList.add("visible");
  } catch (err) {
    if (err.name === "AbortError") {
      setStatus("Request timed out. Check your connection and try again.", "error");
    } else {
      setStatus(err.message || "Something went wrong.", "error");
    }
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "Generate content";
    cancelBtn.classList.add("hidden");
    abortController = null;
  }
}

async function handleCopy() {
  if (!generatedContent) return;

  try {
    await navigator.clipboard.writeText(generatedContent);
    copyBtn.textContent = "\u2713 Copied!";
    setTimeout(() => { copyBtn.textContent = "Copy to clipboard"; }, 2000);
  } catch {
    // Last resort fallback for very old browsers in extension context
    setStatus("Copy failed. Select the text manually.", "error");
  }
}

function handleCancel() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  setStatus("Cancelled.", "info");
  generateBtn.disabled = false;
  generateBtn.textContent = "Generate content";
  cancelBtn.classList.add("hidden");
}

function showLoginPrompt() {
  mainContent.classList.add("hidden");
  loginPrompt.classList.remove("hidden");
  generateBtn.disabled = false;
  generateBtn.textContent = "Generate content";
}

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status status-${type}`;
}
