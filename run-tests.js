const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = __dirname;
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const FIXTURES = new Set(['test-harness.html', 'content.js', 'popup.html', 'popup.js', 'icons/icon-128.png']);
const LOCALES = Object.fromEntries(['pt_BR', 'en'].map(locale => [
  locale,
  JSON.parse(fs.readFileSync(path.join(ROOT, '_locales', locale, 'messages.json'), 'utf8'))
]));
const SCENARIOS = [
  { platform: 'disneyplus', next: true },
  { platform: 'netflix', next: true },
  { platform: 'primevideo', next: true },
  { platform: 'max', next: true },
  { platform: 'crunchyroll', next: false },
  { platform: 'generic', next: true }
];

const server = http.createServer((request, response) => {
  const name = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname.slice(1) || 'test-harness.html');
  const filePath = path.resolve(ROOT, name);
  if (!FIXTURES.has(name) || !fs.existsSync(filePath)) {
    response.writeHead(404);
    response.end('Not Found');
    return;
  }

  const contentType = name.endsWith('.js') ? 'text/javascript; charset=utf-8' : name.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8';
  response.writeHead(200, { 'Content-Type': contentType });
  response.end(fs.readFileSync(filePath));
});

async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  let browser;

  try {
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
    for (const scenario of SCENARIOS) {
      const page = await browser.newPage();
      await page.goto(`${baseUrl}/?platform=${scenario.platform}`, { waitUntil: 'domcontentloaded' });
      const expectedSkips = scenario.platform === 'netflix' ? 4 : scenario.platform === 'crunchyroll' ? 3 : 1;
      if (scenario.platform === 'netflix') {
        await page.waitForFunction(({ expectedSkips }) => window.results.skip === expectedSkips && window.results.next === 1, { expectedSkips }, { timeout: 15000 });
        assert.equal(await page.evaluate(() => window.results.wrongNext), undefined, 'Netflix não deve clicar em rótulos fora do player');
      }
      await page.waitForFunction(({ expectNext, expectedSkips }) => window.results.skip === expectedSkips && (expectNext ? window.results.next === 1 : window.results.next === undefined), { expectNext: scenario.next, expectedSkips }, { timeout: 15000 });
      const results = await page.evaluate(() => window.results);
      const expected = scenario.next ? { skip: expectedSkips, next: 1 } : { skip: expectedSkips };
      assert.deepEqual(results, expected, `Ações incorretas no cenário ${scenario.platform}`);
      console.log(`✓ ${scenario.platform}: ações corretas`);
      await page.close();
    }

    const crunchyScript = MANIFEST.content_scripts.find(script => script.matches.some(match => match.includes('crunchyroll.com')));
    assert.equal(crunchyScript?.all_frames, true, 'Crunchyroll deve executar o script também dentro do iframe do player');

    const popup = await browser.newPage();
    await popup.addInitScript(({ catalogs }) => {
      const locale = new URLSearchParams(location.search).get('lang') || 'pt_BR';
      window.__mailtoHref = '';
      window.addEventListener('click', event => {
        const link = event.target.closest('a');
        if (link?.href.startsWith('mailto:')) {
          event.preventDefault();
          window.__mailtoHref = link.href;
        }
      }, true);
      window.__savedStore = { settings: { enabled: true, skipIntro: true, nextEpisode: true } };
      window.chrome = {
        storage: {
          local: {
            get: (defaults, callback) => callback({ ...defaults, ...window.__savedStore }),
            set: (values, callback) => { Object.assign(window.__savedStore, values); if (callback) callback(); }
          }
        },
        i18n: { getMessage: key => catalogs[locale]?.[key]?.message || catalogs.pt_BR?.[key]?.message || '' },
        runtime: { get lastError() { return null; } }
      };
    }, { catalogs: LOCALES });
    await popup.goto(`${baseUrl}/popup.html?lang=pt_BR`, { waitUntil: 'domcontentloaded' });
    await popup.waitForFunction(() => document.querySelector('#enabled')?.checked === true);
    await popup.locator('#nextEpisode').evaluate(input => input.click());
    await popup.waitForFunction(() => window.__savedStore.settings.nextEpisode === false);
    await popup.locator('#enabled').evaluate(input => input.click());
    await popup.waitForFunction(() => window.__savedStore.settings.enabled === false);
    assert.equal(await popup.locator('#skipIntro').isDisabled(), true, 'Opções devem ser desativadas com AutoSkip desligado');
    await popup.locator('#enabled').evaluate(input => input.click());
    await popup.waitForFunction(() => window.__savedStore.settings.enabled === true);
    assert.equal(await popup.locator('#nextEpisode').isChecked(), false, 'Preferência de avanço deve permanecer salva');
    await popup.locator('#suggestion').fill('Crunchyroll');
    await popup.locator('#sendSuggestion').click();
    await popup.waitForFunction(() => window.__mailtoHref.startsWith('mailto:autoskipstreamings@outlook.com'));
    assert.match(await popup.evaluate(() => window.__mailtoHref), /Sugest%C3%A3o/);
    assert.match(decodeURIComponent(await popup.evaluate(() => window.__mailtoHref)), /Crunchyroll/);
    await popup.goto(`${baseUrl}/popup.html?lang=en`, { waitUntil: 'domcontentloaded' });
    assert.equal(await popup.locator('h1').innerText(), 'AutoSkip for Streaming');
    assert.equal(await popup.locator('#sendSuggestion').innerText(), 'Suggest');
    await popup.close();
    console.log(`✓ popup: configurações, sugestão por e-mail e interface PT-BR/EN`);
    console.log(`\nTodos os ${SCENARIOS.length + 1} cenários passaram.`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

run().catch(error => {
  console.error('Falha nos testes:', error);
  process.exitCode = 1;
});
