// Content script: Injects a floating "Repurpose" button on article pages
// Supports SPAs via MutationObserver

(function () {
  const ARTICLE_SELECTORS = [
    "article",
    "[role='article']",
    ".post-content",
    ".article-body",
    ".entry-content",
    ".blog-post",
    ".post-body",
    "main .content",
    "[itemprop='articleBody']",
    ".postArticle-content",      // Medium
    ".crayons-article__body",    // Dev.to
    ".c-content",                // Substack
  ];

  const EXCLUDED_DOMAINS = [
    "mail.google.com",
    "docs.google.com",
    "sheets.google.com",
    "drive.google.com",
    "notion.so",
    "figma.com",
    "github.com",
    "twitter.com",
    "x.com",
    "linkedin.com",
    "facebook.com",
    "youtube.com",
  ];

  function shouldInject() {
    // Domain exclusion
    if (EXCLUDED_DOMAINS.some((d) => window.location.hostname.includes(d))) return false;

    // Own app exclusion
    if (window.location.hostname.includes("repurpose") || window.location.hostname === "localhost") return false;

    // Already injected
    if (document.getElementById("repurpose-ai-fab")) return false;

    // Check for article element
    if (document.querySelector(ARTICLE_SELECTORS.join(", "))) return true;

    // Fallback: blog-like path with substantial content
    const isBlogPath = /\/(blog|post|article|news|story|p|writing)\//i.test(window.location.pathname);
    if (isBlogPath) {
      const mainContent = document.querySelector("main") || document.body;
      const wordCount = mainContent.innerText.split(/\s+/).length;
      return wordCount >= 400;
    }

    return false;
  }

  function injectFab() {
    if (!shouldInject()) return;

    const fab = document.createElement("button");
    fab.id = "repurpose-ai-fab";
    fab.type = "button";
    fab.setAttribute("aria-label", "Repurpose this page with RepurposeAI");
    fab.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="white" aria-hidden="true">
        <rect x="2" y="2" width="7" height="7" rx="1.5" opacity="0.7"/>
        <rect x="11" y="11" width="7" height="7" rx="1.5" opacity="0.7"/>
        <rect x="11" y="2" width="7" height="7" rx="1.5"/>
        <rect x="2" y="11" width="7" height="7" rx="1.5"/>
      </svg>
    `;

    document.body.appendChild(fab);

    fab.addEventListener("click", () => {
      chrome.runtime.sendMessage({
        type: "OPEN_POPUP",
        url: window.location.href,
      });
    });
  }

  // Try immediately
  injectFab();

  // Also observe DOM for SPA content loading
  let observerTimeout = null;
  const observer = new MutationObserver(() => {
    // Debounce: wait 500ms after last mutation before checking
    if (observerTimeout) clearTimeout(observerTimeout);
    observerTimeout = setTimeout(() => {
      injectFab();
      // Stop observing once injected
      if (document.getElementById("repurpose-ai-fab")) {
        observer.disconnect();
      }
    }, 500);
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });

    // Stop observing after 10 seconds regardless
    setTimeout(() => observer.disconnect(), 10000);
  }
})();
