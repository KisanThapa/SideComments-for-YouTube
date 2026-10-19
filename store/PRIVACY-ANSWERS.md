# Privacy practices — dashboard draft for version 1.2.1

Based on the inspected packaged source. Recheck these answers if functionality,
permissions, analytics, or network behavior changes.

## Single purpose

Rearrange the desktop YouTube watch page so comments appear in the right sidebar
and recommendations appear below the video, with an on/off preference.

## Permission justifications

**storage:** Save the user's on/off preference in local extension storage and
apply changes to open YouTube tabs. No page content is stored.

**YouTube site access / content-script match (`https://www.youtube.com/*`):**
Find and move the existing comments and recommendation elements on desktop
watch pages. Matching YouTube's other paths is needed because the site navigates
from home/search pages to watch pages without a full page reload. The extension
does not request access to other websites or the browser history API.

## Remote code

Select **No**. All extension code is included in the upload ZIP. There is no
remote JavaScript, dynamic code evaluation, or server-provided executable code.

## Data handling

Do not claim that no information is handled merely because processing is local.
Chrome's policy explicitly includes local processing. For this implementation,
the conservative disclosure is:

| Dashboard data category | What this implementation does |
| --- | --- |
| Website content | Handles existing page elements locally to change layout. Does not extract their text, retain their content, or transmit it. Disclose this local use. |
| Web history / browsing activity | Checks the current YouTube page path locally to detect watch pages and respond to navigation. No history API, history log, timestamps, cross-site tracking, or transmission. Disclose this limited current-page use. |
| Other categories | No collection of payment, health, authentication, location, personal communications, or interaction analytics by the extension. Existing public text inside moved page elements is covered by the website-content explanation above. |

Use the dashboard controls that cover **Website content** and **Web history**
for the local handling described above, and review the explanatory wording
shown by the dashboard. This is a conservative disclosure, not a prediction
of Google's review decision.

The single saved value is the `enabled` boolean in local extension storage.
It is not synced by this extension or sent to the developer. If a user
voluntarily contacts support by email, the supplied message is used to respond;
the extension sends no automatic support email.

The packaged implementation supports the data-use statements that information
is not sold, used for unrelated purposes, or used for creditworthiness/lending.
The publisher must review and make the dashboard certifications personally.

## Privacy policy

`privacy.html` contains the policy and the provided support contact. It is also
linked from the extension popup. Host this same file publicly and enter its
real URL in the Dashboard. A `chrome-extension://` or local filesystem URL is
not a public policy URL. No URL is invented in the manifest or listing.

Sources checked October 17, 2026:
- [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Local processing and user data](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Privacy policy requirements](https://developer.chrome.com/docs/webstore/program-policies/privacy)
