# SideComments for YouTube

**Comments beside your video. Recommendations below.**

A Manifest V3 Chrome extension that moves YouTube's existing comments into a
boxed, independently scrollable panel on the right and places recommendations
below the video description. The panel stays height-limited as more comments
load. Normal and theater mode are supported; narrow windows and fullscreen
restore the original positions. A toolbar switch turns the layout on or off.
The panel follows YouTube's light or dark theme, including theme changes without
a reload. The popup follows the browser/system color preference.

The content script starts early without a fixed scheduling delay. YouTube still
controls when its comments and page containers become available. The extension
targets desktop `www.youtube.com` watch pages; Shorts, embeds, the mobile site,
and alternative YouTube layout experiments are outside scope.

## Chrome Web Store preparation

- [Submission steps and reviewer instructions](store/SUBMISSION.md)
- [Listing text](store/LISTING.md)
- [Privacy dashboard answers](store/PRIVACY-ANSWERS.md)
- [Privacy policy](privacy.html)
- Store images: `store/assets/`
- Upload ZIP: `dist/sidecomments-for-youtube-1.2.1.zip`

The package is prepared locally. Publisher registration, contact verification,
a public HTTPS URL for the privacy page, Dashboard settings, and Google's review
are still required. No store item has been created or submitted.

Public support contact: **kisanthapa33@gmail.com**.

## Install locally

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select the folder containing `manifest.json`.
3. Refresh any YouTube tabs that were already open.

Pin **SideComments for YouTube** to access its switch. After editing extension
files, reload the extension and refresh YouTube again.

## Privacy and permissions

The extension processes the current YouTube page structure and path locally to
rearrange the page. The only saved extension setting is the on/off preference in
local `chrome.storage`. It has no analytics, remote code, backend, advertising,
or transmission of page information to the developer. YouTube's own services
continue to handle videos, comments, and user actions.

Only the `storage` API permission and the `https://www.youtube.com/*` content-script
match are used. The match includes other YouTube paths so navigation into a
watch page works without a full reload. See the packaged privacy policy for
local processing, retention, and support-email details.

## Development and release

Node.js 22+ is needed for development; packaging and local store checks use
Python 3.9+. The extension itself needs no build or development dependencies.

```sh
npm ci
npx playwright install chromium
npm run check
npm test
npm run package
npm run check:store
```

Optional commands:

```sh
npm run assets       # Regenerate original icons and 440×280 promotional tile
npm run screenshots  # Capture native YouTube screenshots at 1280×800
npm run test:live     # Check live comment loading, theater mode, and resizing
npm run test:live -- --dark  # Check YouTube's dark appearance
```

`npm test` runs the real unpacked extension against synthetic HTML fixtures in a
disposable Chromium profile. The live check and store screenshots use public
YouTube in a signed-out profile and depend on network access and its current
layout. Store screenshots are separate from the synthetic fixture.

For an existing browser installation, set `CHROMIUM_PATH`. To check an extracted
release ZIP instead of the source extension, set `EXTENSION_PATH`. An existing
Playwright package can be supplied with `PLAYWRIGHT_MODULE_PATH`.

The packaging script uses an explicit runtime allowlist. The ZIP has
`manifest.json` at its root and excludes tests, development dependencies,
repository files, and store listing assets. Local store checks validate the ZIP,
image dimensions, version consistency, and declared permissions; they do not
establish Web Store approval. CI runs the fixture suite and local release checks.

Generated dependencies, old build outputs, and test screenshots are excluded by
`.gitignore`. Source tests, the lockfile, and release scripts are retained for
future updates. See [CHANGELOG.md](CHANGELOG.md) for changes.

This is an independent extension, not affiliated with or endorsed by Google or
YouTube. YouTube is a trademark of Google LLC.
