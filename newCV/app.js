const target = document.getElementById("md-rendered");

if (target) {
  const sourcePath = target.dataset.source || "cv.md";
  loadMarkdown(sourcePath);
}

async function loadMarkdown(path) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load ${path}`);
    }
    const text = await response.text();
    target.innerHTML = renderMarkdown(text.trim());
  } catch (error) {
    target.innerHTML = `<p class="md-loading">Unable to load ${path}. Open this page via a local web server.</p>`;
  }
}

function renderMarkdown(md) {
  let safe = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const codeBlocks = [];
  safe = safe.replace(/```([\s\S]*?)```/g, (match, code) => {
    const index = codeBlocks.length;
    codeBlocks.push(code.trimEnd());
    return `@@CODE${index}@@`;
  });

  safe = safe.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
    const cleanUrl = url.trim();
    if (cleanUrl.includes("youtube.com/embed/")) {
      return `<div class="md-video"><iframe src="${cleanUrl}" title="Embedded video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    }
    return `<img alt="${alt}" src="${cleanUrl}">`;
  });

  safe = safe.replace(/^###\s+(.*)$/gm, "<h3>$1</h3>");
  safe = safe.replace(/^##\s+(.*)$/gm, "<h2>$1</h2>");
  safe = safe.replace(/^#\s+(.*)$/gm, "<h1>$1</h1>");
  safe = safe.replace(/^>\s+(.*)$/gm, "<blockquote>$1</blockquote>");
  safe = safe.replace(/^---$/gm, "<hr>");

  safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  safe = safe.replace(/\*(.+?)\*/g, "<em>$1</em>");
  safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>");
  safe = safe.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href=\"$2\" target=\"_blank\" rel=\"noopener\">$1</a>");

  const lines = safe.split("\n");
  const out = [];
  let inList = false;

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed === "") {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      return;
    }

    if (trimmed.match(/^@@CODE\d+@@$/)) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(trimmed);
      return;
    }

    if (trimmed.startsWith("<h") || trimmed.startsWith("<blockquote") || trimmed.startsWith("<hr") || trimmed.startsWith("<div class=\"md-video\"")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(trimmed);
      return;
    }

    const taskMatch = trimmed.match(/^- \[( |x|X)\]\s+(.*)/);
    if (taskMatch) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      const checked = taskMatch[1].toLowerCase() === "x" ? "checked" : "";
      out.push(`<li class="task-item"><input type="checkbox" disabled ${checked}>${taskMatch[2]}</li>`);
      return;
    }

    if (/^-\s+/.test(trimmed)) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${trimmed.replace(/^-\s+/, "")}</li>`);
      return;
    }

    if (inList) {
      out.push("</ul>");
      inList = false;
    }

    out.push(`<p>${trimmed}</p>`);
  });

  if (inList) {
    out.push("</ul>");
  }

  let html = out.join("\n");
  html = html.replace(/@@CODE(\d+)@@/g, (match, index) => {
    const code = codeBlocks[Number(index)] || "";
    return `<pre><code>${code}</code></pre>`;
  });

  return html;
}

const root = document.documentElement;
let bgX = 0;
let bgY = window.scrollY;
let ticking = false;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function syncBackground() {
  if (ticking) return;
  ticking = true;
  window.requestAnimationFrame(() => {
    root.style.setProperty("--bg-x", `${bgX.toFixed(0)}px`);
    root.style.setProperty("--bg-y", `${bgY.toFixed(0)}px`);
    ticking = false;
  });
}

window.addEventListener("scroll", () => {
  bgY = window.scrollY;
  syncBackground();
}, { passive: true });

if (!reducedMotion) {
  window.addEventListener("mousemove", (event) => {
    bgX = (event.clientX / window.innerWidth - 0.5) * 40;
    syncBackground();
  });
}

syncBackground();
