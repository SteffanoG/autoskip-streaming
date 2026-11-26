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
    skipSelectors: [
      '[data-uia="player-skip-intro"]',
      '[data-uia="player-skip-recap"]',
      '[data-uia="player-skip-ad"]',
      '.watch-video--skip-content-button',
      '.skip-credits'
    ],
    nextSelectors: ['[data-uia="next-episode-seamless-button"]'],
    skipTexts: ["pular abertura", "skip intro", "pular resumo", "skip recap", "pular anúncio", "pular anuncio", "skip ad", "pular créditos", "pular creditos", "skip credits"],
    nextTexts: ["próximo episódio", "next episode", "reproduzir próximo episódio", "play next episode"]
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
    skipSelectors: [
      'button[data-testid="skipButton"]',
      '[data-testid="skipButton"] button',
      '[data-testid="skipButton"] [role="button"]',
      '[data-testid="skipButton"] [tabindex="0"]',
      '[data-testid="skipButton"]',
      'button[aria-label*="Skip Intro" i]',
      'button[aria-label*="Skip Recap" i]',
      'button[aria-label*="Skip Credits" i]',
      'button[aria-label*="Pular abertura" i]',
      'button[aria-label*="Pular introdução" i]',
      'button[aria-label*="Pular resumo" i]',
      'button[aria-label*="Pular créditos" i]',
      'button[data-testid*="skip-intro" i]',
      'button[data-testid*="skip-recap" i]',
      'button[data-testid*="skip-credit" i]'
    ],
    nextSelectors: [],
    skipTexts: [
      "skip intro", "pular abertura", "pular introdução", "skip recap", "pular resumo",
      "skip credits", "pular créditos", "skip outro", "skip preview",
      "pular prévia", "pular previa"
    ],
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

function isEnabled(element) {
  return !element.disabled && element.getAttribute("aria-disabled") !== "true";
}

function getClickTarget(element) {
  // O player pode pôr data-testid no contêiner, mas registrar o clique no
  // botão interno. Disparar .click() no contêiner não ativa esse controle.
  const interactiveSelector = "button, a, [role='button']";
  if (element.matches(interactiveSelector)) return element;

  const descendant = Array.from(element.querySelectorAll(interactiveSelector))
    .find(candidate => isVisible(candidate) && isEnabled(candidate));
  if (descendant) return descendant;

  return element.closest(interactiveSelector) ||
    element.closest("[tabindex='0']") || element;
}

function isVisible(element) {
  // aria-hidden controla leitores de tela, não a visibilidade visual. A Crunchyroll
  // pode mantê-lo no botão focado mesmo após emitir um aviso de aria-hidden bloqueado.
  if (element.closest("[hidden], [inert]")) return false;
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" &&
    Number(style.opacity) !== 0 && style.pointerEvents !== "none" &&
    element.getClientRects().length > 0;
}

function isNetflixPlayerControl(element) {
  const control = element.getBoundingClientRect();
  const centerX = control.left + control.width / 2;
  const centerY = control.top + control.height / 2;
  return querySelectorAllDeep("video").some(video => {
    if (!isVisible(video)) return false;
    const player = video.getBoundingClientRect();
    return centerX >= player.left - 24 && centerX <= player.right + 24 &&
      centerY >= player.top - 24 && centerY <= player.bottom + 24;
  });
}

function safeClick(element, action, platformName) {
  if (!element) return false;
  element = getClickTarget(element);
  // Players may reuse the same DOM button for each episode. Rearm it only after
  // the control disappears, so it can be clicked again at the next episode end.
  if (!isVisible(element)) {
    clickedElements.delete(element);
    return false;
  }
  if (clickedElements.has(element) || isDismissButton(element) || !isEnabled(element)) return false;

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

function tryText(labels, action, platformName, predicate = () => true) {
  const candidates = querySelectorAllDeep("button, a, [role='button']");
  for (const element of candidates) {
    const label = getLabel(element);
    if (label && labels.some(text => label.includes(text)) && predicate(element) && safeClick(element, action, platformName)) {
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
  const textControlPredicate = rule?.id === "netflix" ? isNetflixPlayerControl : undefined;

  if (settings.skipIntro) {
    if (rule && trySelectors(rule.skipSelectors, "skip", name)) return;
    if (tryText(skipTexts, "skip", name, textControlPredicate)) return;
  }
  if (settings.nextEpisode) {
    if (rule && trySelectors(rule.nextSelectors, "next", name)) return;
    tryText(nextTexts, "next", name, textControlPredicate);
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
