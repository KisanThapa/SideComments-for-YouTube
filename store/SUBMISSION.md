# Chrome Web Store submission

## Prepared locally

- Manifest V3, narrow YouTube match, and only the `storage` API permission.
- Packaged code only; no remote code or backend.
- Runtime-only ZIP from `npm run package`, with `manifest.json` at its root.
- Listing text in [LISTING.md](LISTING.md).
- Privacy answers in [PRIVACY-ANSWERS.md](PRIVACY-ANSWERS.md).
- A privacy page at [privacy.html](../privacy.html), with the supplied support email.
- Store icon, promotional tile, and native screenshots under `assets/`.

## Remaining publisher steps

1. Sign in to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
   Complete registration, any required payment, publisher information, and
   contact verification. These account actions have not been performed.
2. Host `privacy.html` at a public HTTPS URL. Use that URL in the privacy field.
   A GitHub Pages site or another public static host can serve this file. A
   repository/domain has not been supplied, so hosting is not configured yet.
3. Run `npm run check`, `npm test`, `npm run package`, and `npm run check:store`.
   Upload `dist/sidecomments-for-youtube-1.2.0.zip` as a new item (or a higher
   version under the same item for future updates).
4. Paste the listing and privacy text, upload the icon and images, and choose
   the Dashboard's category, visibility, and distribution settings.
5. Use the test instructions below. Review all data-use certifications against
   the package, then submit for review. Approval and review timing are determined
   by Google; local checks do not establish approval.

## Reviewer test instructions — paste into the Dashboard

No extension account, license key, or paid features are required. Use desktop
www.youtube.com in a wide Chrome window and open a normal video with comments.
If a consent screen appears, complete it through YouTube's normal controls.

1. Confirm comments appear on the right and recommended videos appear below
   the video description.
2. Scroll inside the boxed comments panel. It should scroll independently and
   load more comments through YouTube, while keeping its height limited.
3. Use YouTube's theater control. The wide player stays above the page content;
   comments remain on the right of the content below it.
4. Open the extension toolbar popup and switch it off. The original positions
   should return. Switch it on to restore the swapped layout.
5. Make the window narrow or enter fullscreen. The original layout returns.
6. Open the Privacy link in the popup to read the packaged policy.

No signed-in account is required to verify the layout. Posting or replying to
comments follows YouTube's usual sign-in requirements. This extension targets
the standard `ytd-watch-flexy` layout; if YouTube serves a different experiment,
it leaves that interface unchanged. Shorts and embedded players are outside scope.

## Release assets

`npm run assets` renders the original icons and small promotional image.
`npm run screenshots` runs the live check at 1280×800 and captures two real
screenshots; it requires network access and a compatible YouTube layout.
Review the images before submission, including any third-party content visible
in a public video page. No synthetic fixture is used for store screenshots.

The upload ZIP excludes the store assets, tests, development dependencies, and
repository metadata. Keep source tests and the lockfile for future updates.

## Local verification — October 17, 2026

- Version 1.2.0: all 14 fixture checks passed for the source extension and for
  the final ZIP extracted into `dist/unpacked-check`, with no page JavaScript errors.
- Live YouTube: scrolling the boxed panel loaded more threads (20 to 40 in the
  observed run) without increasing its height. Theater mode and narrow-window
  restoration passed. This is a functional check, not a speed benchmark.
- Image dimensions, the 11-file runtime allowlist, and ZIP/source equality passed.
  Rebuilding identical inputs produced a byte-identical ZIP in this environment.
- Environment: macOS, Playwright 1.62.1, Chromium 153.0.8010.12; fixtures at
  1440×1000 and live store screenshots at 1280×800.
- Chrome did not activate extracted copies in a system temporary folder during
  this run; the successful extracted-package check used the project folder.
  Signed-in posting and GitHub Actions were not executed. Google review has not occurred.

Official references:
- [Prepare the ZIP](https://developer.chrome.com/docs/webstore/prepare)
- [Publish an item](https://developer.chrome.com/docs/webstore/publish)
- [Developer registration](https://developer.chrome.com/docs/webstore/register)
- [Publisher account setup](https://developer.chrome.com/docs/webstore/set-up-account)
