/**
 * AutoSkip: procura controles explícitos para pular conteúdo e avançar episódio.
 * O teste local pode escolher uma plataforma com ?platform=<id>.
 */
const CONFIG = {
  debug: false,
  checkIntervalMs: 1200,
  observerDebounceMs: 120,
  nextClickCooldownMs: 10000,
  skipClickCooldownMs: 1500
};
const DEFAULT_SETTINGS = { enabled: true, skipIntro: true, nextEpisode: true };
let settings = { ...DEFAULT_SETTINGS };

const STREAMING_RULES = [
  {
    id: "disneyplus",
    domain: "disneyplus.com",
    name: "Disney+",
    skipSelectors: ['[data-testid="skip-button"]', '.skip-button'],
    nextSelectors: ['[data-testid="up-next-button"]'],
    skipTexts: ["skip intro", "pular abertura", "skip recap", "pular resumo", "skip credit"],
    nextTexts: ["up next", "próximo episódio", "next episode"]
  },
  {
    id: "netflix",
    domain: "netflix.com",
    name: "Netflix",
    skipSelectors: ['[data-uia="player-skip-intro"]', '.watch-video--skip-content-button', '.skip-credits'],
    nextSelectors: ['[data-uia="next-episode-seamless-button"]'],
    skipTexts: ["pular abertura", "skip intro"],
    nextTexts: ["próximo episódio", "next episode"]
  },
  {
    id: "primevideo",
    domain: "primevideo.com",
    name: "Amazon Prime Video",
    skipSelectors: ['.atvwebplayersdk-skipelement-button', '.skipElement'],
    nextSelectors: ['.atvwebplayersdk-nextupcard-button'],
    skipTexts: ["pular introdução", "skip intro"],
    nextTexts: ["próximo episódio", "next episode"]
  },
  {
    id: "max",
    domain: "max.com",
    name: "Max",
    skipSelectors: ['[aria-label="Skip Intro"]', '[aria-label="Pular abertura"]'],
    nextSelectors: ['[aria-label="Next Episode"]', '[aria-label="Próximo episódio"]'],
    skipTexts: ["skip intro", "pular abertura"],
    nextTexts: ["next episode", "próximo episódio"]
  },
  {
    id: "crunchyroll",
    domain: "crunchyroll.com",
    name: "Crunchyroll",
    skipSelectors: ['button[aria-label="Skip Intro"]', 'button[aria-label="Pular abertura"]'],
    nextSelectors: [],
    skipTexts: ["skip intro", "pular abertura"],
    nextTexts: []
  }
];

const DISMISS_KEYWORDS = ["close", "fechar", "dismiss", "cancel", "cancelar"];
const lastClickByAction = { skip: 0, next: 0 };
const clickedElements = new WeakSet();

function log(...args) {
  if (CONFIG.debug) console.log("[AutoSkip]", ...args);
}

function querySelectorAllDeep(selector, root = document) {
  let elements = Array.from(root.querySelectorAll(selector));
  for (const host of root.querySelectorAll("*")) {
    if (host.shadowRoot) elements = elements.concat(querySelectorAllDeep(selector, host.shadowRoot));
  }
  return elements;
}

function getCurrentPlatformRule() {
  const host = window.location.hostname.toLowerCase();

  // Só permite simulação quando o script é aberto no servidor local de testes.
  if (host === "localhost" || host === "127.0.0.1") {
    const id = new URLSearchParams(window.location.search).get("platform");
    if (id) return STREAMING_RULES.find(rule => rule.id === id) || null;
  }

  return STREAMING_RULES.find(rule =>
    host === rule.domain || host.endsWith(`.${rule.domain}`)
  ) || null;
}

function getLabel(element) {
  return [
    element.getAttribute("aria-label"),
    element.innerText,
    element.getAttribute("title")
  ].filter(Boolean).join(" ").toLowerCase().trim();
}

function isDismissButton(element) {
  const aria = (element.getAttribute("aria-label") || "").toLowerCase().trim();
  const text = (element.innerText || "").toLowerCase().trim();
  return DISMISS_KEYWORDS.some(keyword =>
    aria === keyword || text === keyword || aria.includes("close")
  );
}

function isVisibleAndEnabled(element) {
  if (element.disabled || element.getAttribute("aria-disabled") === "true") return false;
  if (element.closest("[hidden], [aria-hidden='true'], [inert]")) return false;
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
}

function safeClick(element, action, platformName) {
  if (!element || clickedElements.has(element) || isDismissButton(element) || !isVisibleAndEnabled(element)) {
    return false;
  }

  const now = Date.now();
  const cooldown = action === "next" ? CONFIG.nextClickCooldownMs : CONFIG.skipClickCooldownMs;
  if (now - lastClickByAction[action] < cooldown) return false;

  try {
    // HTMLElement.click() já dispara o evento de clique; eventos manuais extras
    // podem duplicar a ação e não reproduzem um gesto confiável do usuário.
    element.click();
    clickedElements.add(element);
    lastClickByAction[action] = now;
    log(`${platformName}: ação ${action}`, element);
    return true;
  } catch (error) {
    console.error("[AutoSkip] Não foi possível clicar no controle:", error);
    return false;
  }
}

function trySelectors(selectors, action, platformName) {
  for (const selector of selectors || []) {
    for (const element of querySelectorAllDeep(selector)) {
      if (safeClick(element, action, platformName)) return true;
    }
  }
  return false;
}

function tryText(labels, action, platformName) {
  const candidates = querySelectorAllDeep("button, a, [role='button']");
  for (const element of candidates) {
    const label = getLabel(element);
    if (label && labels.some(text => label.includes(text)) && safeClick(element, action, platformName)) {
      return true;
    }
  }
  return false;
}

function runEngine() {
  if (!settings.enabled) return;
  const rule = getCurrentPlatformRule();
  const name = rule?.name || "plataforma compatível";
  const skipTexts = rule?.skipTexts || ["skip intro", "pular abertura", "pular introdução", "skip recap", "skip credit"];
  const nextTexts = rule?.nextTexts || ["next episode", "próximo episódio", "up next"];

  if (settings.skipIntro) {
    if (rule && trySelectors(rule.skipSelectors, "skip", name)) return;
    if (tryText(skipTexts, "skip", name)) return;
  }
  if (settings.nextEpisode) {
    if (rule && trySelectors(rule.nextSelectors, "next", name)) return;
    tryText(nextTexts, "next", name);
  }
}

function loadSettings() {
  if (!globalThis.chrome?.storage?.local) return;
  chrome.storage.local.get({ settings: DEFAULT_SETTINGS }, result => {
    if (chrome.runtime?.lastError) return;
    settings = { ...DEFAULT_SETTINGS, ...result.settings };
    runEngine();
  });
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes.settings) return;
    settings = { ...DEFAULT_SETTINGS, ...changes.settings.newValue };
    runEngine();
  });
}

let scheduledRun = null;
const observer = new MutationObserver(() => {
  if (scheduledRun !== null) return;
  scheduledRun = window.setTimeout(() => {
    scheduledRun = null;
    runEngine();
  }, CONFIG.observerDebounceMs);
});

if (document.documentElement) {
  loadSettings();
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-label", "aria-disabled", "disabled", "hidden", "class"]
  });
  window.setInterval(runEngine, CONFIG.checkIntervalMs);
  runEngine();
}
