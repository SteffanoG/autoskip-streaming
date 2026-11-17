const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const ALLOWED = new Map([
  ['/preview.html', path.join(__dirname, 'preview.html')],
  ['/popup.html', path.join(ROOT, 'popup.html')],
  ['/popup.js', path.join(ROOT, 'popup.js')],
  ['/icons/icon.svg', path.join(ROOT, 'icons', 'icon.svg')],
  ['/icons/icon-128.png', path.join(ROOT, 'icons', 'icon-128.png')]
]);
const server = http.createServer((request, response) => {
  const filePath = ALLOWED.get(new URL(request.url, 'http://127.0.0.1').pathname);
  if (!filePath || !fs.existsSync(filePath)) {
    response.writeHead(404).end('Not Found');
    return;
  }
  const type = filePath.endsWith('.js') ? 'text/javascript' : filePath.endsWith('.png') ? 'image/png' : filePath.endsWith('.svg') ? 'image/svg+xml' : 'text/html';
  response.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
  response.end(fs.readFileSync(filePath));
});

async function main() {
  const iconSvg = fs.readFileSync(path.join(ROOT, 'icons', 'icon.svg'), 'utf8');
  const promoSvg = fs.readFileSync(path.join(__dirname, 'small-promo.svg'), 'utf8');
  const promoEnSvg = fs.readFileSync(path.join(__dirname, 'small-promo-en.svg'), 'utf8');
  const catalogs = Object.fromEntries(['pt_BR', 'en'].map(locale => [
    locale,
    JSON.parse(fs.readFileSync(path.join(ROOT, '_locales', locale, 'messages.json'), 'utf8'))
  ]));
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const iconPage = await browser.newPage({ viewport: { width: 128, height: 128 }, deviceScaleFactor: 1 });
    await iconPage.setContent(iconSvg);
    await iconPage.screenshot({ path: path.join(ROOT, 'icons', 'icon-128.png'), omitBackground: true });

    const promoPage = await browser.newPage({ viewport: { width: 440, height: 280 }, deviceScaleFactor: 1 });
    await promoPage.setContent(promoSvg);
    await promoPage.screenshot({ path: path.join(__dirname, 'small-promo.png'), omitBackground: true });
    await promoPage.setContent(promoEnSvg);
    await promoPage.screenshot({ path: path.join(__dirname, 'small-promo-en.png'), omitBackground: true });

    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    await page.addInitScript(({ catalogs: localeCatalogs }) => {
      const locale = new URLSearchParams(location.search).get('lang') || 'pt_BR';
      const localData = { settings: { enabled: true, skipIntro: true, nextEpisode: true } };
      window.chrome = {
        storage: {
          local: {
            get: (defaults, callback) => callback({ ...defaults, ...localData }),
            set: (values, callback) => { Object.assign(localData, values); if (callback) callback(); }
          }
        },
        i18n: { getMessage: key => localeCatalogs[locale]?.[key]?.message || localeCatalogs.pt_BR?.[key]?.message || '' },
        runtime: { get lastError() { return null; } }
      };
    }, { catalogs });
    await page.goto(`http://127.0.0.1:${port}/preview.html?lang=pt_BR`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(__dirname, 'screenshot-1280x800-pt-BR.png') });
    await page.goto(`http://127.0.0.1:${port}/preview.html?lang=en`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(__dirname, 'screenshot-1280x800-en.png') });
  } finally {
    await browser.close();
    if (server.listening) await new Promise(resolve => server.close(resolve));
  }
  console.log('Gerados ícone e materiais de loja em português e inglês.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
