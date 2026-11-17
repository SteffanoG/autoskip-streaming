const DEFAULT_SETTINGS = { enabled: true, skipIntro: true, nextEpisode: true };
const SUPPORT_EMAIL = "autoskipstreamings@outlook.com";
const controls = ["enabled", "skipIntro", "nextEpisode"];
const status = document.querySelector("#status");

function translatePopup() {
  if (!globalThis.chrome?.i18n?.getMessage) return;
  for (const element of document.querySelectorAll("[data-i18n]")) {
    const message = chrome.i18n.getMessage(element.dataset.i18n);
    if (message) element.textContent = message;
  }
  for (const element of document.querySelectorAll("[data-i18n-placeholder]")) {
    const message = chrome.i18n.getMessage(element.dataset.i18nPlaceholder);
    if (message) element.placeholder = message;
  }
  for (const element of document.querySelectorAll("[data-i18n-aria]")) {
    const message = chrome.i18n.getMessage(element.dataset.i18nAria);
    if (message) element.setAttribute("aria-label", message);
  }
}
translatePopup();

function showSettings(settings) {
  for (const key of controls) document.querySelector(`#${key}`).checked = Boolean(settings[key]);
  document.querySelector("#skipIntro").disabled = !settings.enabled;
  document.querySelector("#nextEpisode").disabled = !settings.enabled;
}

chrome.storage.local.get({ settings: DEFAULT_SETTINGS }, result => {
  showSettings({ ...DEFAULT_SETTINGS, ...result.settings });
});

document.querySelector("#enabled").addEventListener("change", saveSettings);
document.querySelector("#skipIntro").addEventListener("change", saveSettings);
document.querySelector("#nextEpisode").addEventListener("change", saveSettings);

function saveSettings() {
  const settings = Object.fromEntries(controls.map(key => [key, document.querySelector(`#${key}`).checked]));
  chrome.storage.local.set({ settings }, () => {
    if (chrome.runtime.lastError) {
      status.textContent = chrome.i18n?.getMessage("statusSaveError") || "Não foi possível salvar. Tente novamente.";
      return;
    }
    showSettings(settings);
    status.textContent = "Preferências salvas somente neste navegador.";
  });
}

document.querySelector("#suggestionForm").addEventListener("submit", event => {
  event.preventDefault();
  const suggestion = document.querySelector("#suggestion").value.trim();
  if (!suggestion) return;

  const subject = encodeURIComponent("Sugestão de streaming para o AutoSkip");
  const body = encodeURIComponent(`Sugestão de serviço: ${suggestion}`);
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  const link = document.createElement("a");
  link.href = mailto;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  status.textContent = chrome.i18n?.getMessage("statusEmailOpen") || "E-mail aberto. Revise a sugestão e envie para a equipe.";
});
