# AutoSkip for Streaming

Manifest V3 extension localized in Brazilian Portuguese and English. It skips intros/recaps and advances to the next episode on Disney+, Netflix, Prime Video, and Max. On Netflix, it also recognizes recap, credits, and ad skip controls when the platform provides them. On Crunchyroll, it recognizes intro, recap, and credits skip controls when available; availability depends on the title and the platform.

## Features

- Enable or pause AutoSkip from the popup.
- Control intro/recap skipping and next-episode advance separately.
- Suggest another streaming service by preparing an email to `autoskipstreamings@outlook.com`; the user reviews and sends it.
- Store preferences locally in Chrome.

The extension reads playback control labels and accessible attributes only on the domains declared in the manifest. It does not transmit or save page text. Service interfaces and button availability may change.

## Install

Desktop only. You do not need Node or `npm install`.

1. Download the [project ZIP](https://github.com/SteffanoG/autoskip-streaming/archive/refs/heads/main.zip) and extract it to a permanent folder. The extension stops working if the folder is deleted or moved.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the folder that contains `manifest.json` (`autoskip-streaming-main` in the extracted ZIP).
5. Reload any streaming tabs that were already open.

### Update

Updates are manual.

- **ZIP:** download it again, replace the files in the same folder, and click reload on the extension card in `chrome://extensions`.
- **Git:** clone once with `git clone https://github.com/SteffanoG/autoskip-streaming.git`. To update, run `git pull` in that folder and reload the extension.

After reloading the extension, also reload any open streaming tabs.

The `storage` permission saves popup preferences in Chrome local storage. Content scripts are limited to the supported HTTPS domains in `manifest.json`.

## Test and package

Run `npm install`, then `npm test`. The Playwright harness uses an installed copy of Chrome and simulated page controls; it does not confirm behavior on authenticated streaming pages.

Run `npm run package:store` to generate the Chrome Web Store ZIP and listing assets in Portuguese and English. The ZIP is created under `dist/` and is intentionally ignored by Git.

## Store materials

- Portuguese listing: [`store-listing/listing-pt-BR.md`](store-listing/listing-pt-BR.md)
- English listing: [`store-listing/listing-en.md`](store-listing/listing-en.md)
- Privacy policies: [`privacy-policy.html`](privacy-policy.html) and [`privacy-policy.en.html`](privacy-policy.en.html)
- Release checklist: [`store-listing/release-checklist.md`](store-listing/release-checklist.md)

Before store submission, host both privacy policies at public HTTPS URLs and complete the Developer Dashboard declarations.

## License

MIT. Streaming service names and marks belong to their respective owners. AutoSkip is an independent project and is not affiliated with or endorsed by those services.
