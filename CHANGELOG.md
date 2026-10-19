# Changelog

## 1.2.1

- Match the comments panel background, text, border, and scrollbar to YouTube's
  light or dark theme, including immediate theme switches without a reload.
- Keep the dark panel readable when legacy YouTube background tokens are
  missing or stale; preserve the boxed scrolling layout.

## 1.2.0

- Restore the boxed comments panel with independent scrolling and limited height.
- Retain early startup without a fixed scheduling delay.
- Prepare Chrome Web Store listing text, privacy disclosures, and store assets.
- Add a privacy page and support contact to the popup.
- Restrict extension-page scripts to packaged files and disable object embeds.
- Validate the upload ZIP and image dimensions before submission.

## 1.1.1

- Rename the extension to **SideComments for YouTube**.
- Add repeatable release packaging and GitHub Actions checks.
- Clean up repository documentation and generated artifacts.

## 1.1.0

- Let comments grow with the page instead of using a separate scroll window.
- Start the content script earlier and remove the fixed scheduling delay.

## 1.0.0

- Move comments to the right sidebar and recommendations below the video.
- Support normal and theater mode, responsive restoration, and an on/off switch.
