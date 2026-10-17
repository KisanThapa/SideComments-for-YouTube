(() => {
  "use strict";

  const structuralSelector = "ytd-watch-flexy, #columns, #primary, #secondary, #secondary-inner, #below, ytd-comments#comments, #related";
  let enabled = true;
  let settingsReady = false;
  let navigationPending = false;
  let timer = null;
  let state = null;
  let layoutTarget = null;
  let layoutWidth = -1;

  // At document_start the columns can exist before their layout is ready.
  // Retry on width changes without polling or waiting for the page to finish.
  const layoutObserver = new ResizeObserver(([entry]) => {
    if (entry && entry.contentRect.width !== layoutWidth) {
      layoutWidth = entry.contentRect.width;
      schedule();
    }
  });

  function observeLayout(watch) {
    const target = watch?.querySelector("#columns") || watch;
    if (target === layoutTarget) return;
    layoutObserver.disconnect();
    layoutTarget = target;
    layoutWidth = -1;
    if (target) layoutObserver.observe(target);
  }

  const observer = new MutationObserver((records) => {
    // Ignore comment text, avatars, player time updates, and other leaf changes.
    if (records.some((record) => record.type === "attributes" ||
      [...record.addedNodes, ...record.removedNodes].some((node) =>
        node.nodeType === Node.ELEMENT_NODE &&
        (node.matches(structuralSelector) || node.querySelector(structuralSelector))))) {
      schedule();
    }
  });

  function observe() {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["theater", "fullscreen", "is-two-columns_", "hidden"]
    });
  }

  function schedule() {
    if (settingsReady && timer === null) timer = requestAnimationFrame(reconcile);
  }

  function restore(replacements = {}) {
    if (!state) return;
    const { watch, comments, related, commentsAnchor, relatedAnchor, panel } = state;
    // Do not resurrect detached renderers after YouTube has replaced a page.
    for (const [name, node, anchor] of [
      ["comments", comments, commentsAnchor], ["related", related, relatedAnchor]
    ]) {
      node.classList.remove(`ytcs-${name}`);
      if (replacements[name] && replacements[name] !== node) {
        node.remove();
      } else if (node.isConnected && anchor.isConnected && watch.contains(anchor)) {
        anchor.after(node);
      }
      anchor.remove();
    }
    // If the original slot disappeared, keep a still-live comments node visible.
    if (panel.contains(comments) && panel.isConnected) panel.before(comments);
    panel.remove();
    watch.classList.remove("ytcs-active");
    state = null;
  }

  function twoColumns(watch) {
    const primary = watch.querySelector("#primary");
    const secondary = watch.querySelector("#secondary");
    if (!primary || !secondary || watch.hasAttribute("fullscreen") || document.fullscreenElement) return false;
    const left = primary.getBoundingClientRect();
    const right = secondary.getBoundingClientRect();
    // Use actual geometry so theater mode and YouTube's responsive breakpoint
    // follow the page's own layout, rather than a hard-coded screen width.
    return left.width > 0 && right.width >= 250 && right.left >= left.right - 2;
  }

  function reconcile() {
    timer = null;
    observer.disconnect();
    try {
      const watch = document.querySelector("ytd-watch-flexy:not([hidden])");
      observeLayout(watch);
      if (!enabled || navigationPending || location.pathname !== "/watch" || !watch || !twoColumns(watch)) {
        restore();
        return;
      }

      // Prefer new native renderers if a SPA transition replaced either section.
      const comments = watch.querySelector("ytd-comments#comments:not(.ytcs-comments)") ||
        watch.querySelector("ytd-comments#comments");
      // YouTube also has a #related inside #related-skeleton. Only use the
      // real sidebar slot, or our already-moved renderer.
      const related = watch.querySelector("#secondary-inner > #related, #secondary > #related") ||
        (state?.watch === watch && state.related.isConnected ? state.related : null);
      if (state && (state.watch !== watch || state.comments !== comments || state.related !== related ||
        !state.commentsAnchor.isConnected || !state.relatedAnchor.isConnected || !state.panel.isConnected)) {
        restore(state.watch === watch ? { comments, related } : {});
      }
      if (!comments || !related || comments.hidden || related.hidden ||
        !watch.querySelector("#primary")?.contains(state ? state.commentsAnchor : comments) ||
        !watch.querySelector("#secondary")?.contains(state ? state.relatedAnchor : related)) {
        restore();
        return;
      }

      if (state) {
        // Repair a native reparent without adding duplicate anchors or wrappers.
        if (comments.parentElement !== state.panel) state.panel.append(comments);
        if (related.previousSibling !== state.commentsAnchor) state.commentsAnchor.after(related);
        return;
      }

      const commentsAnchor = document.createComment("ytcs: original comments position");
      const relatedAnchor = document.createComment("ytcs: original recommendations position");
      comments.before(commentsAnchor);
      related.before(relatedAnchor);
      const panel = document.createElement("section");
      panel.className = "ytcs-comments-panel";
      panel.setAttribute("aria-label", "Video comments");
      panel.tabIndex = 0;
      relatedAnchor.after(panel);
      panel.append(comments);
      commentsAnchor.after(related);
      comments.classList.add("ytcs-comments");
      related.classList.add("ytcs-related");
      watch.classList.add("ytcs-active");
      state = { watch, comments, related, commentsAnchor, relatedAnchor, panel };
    } finally {
      observe();
    }
  }

  document.addEventListener("yt-navigate-start", () => {
    navigationPending = true;
    schedule();
  });
  for (const event of ["yt-navigate-finish", "yt-page-data-updated"]) {
    document.addEventListener(event, () => {
      navigationPending = false;
      schedule();
    });
  }
  document.addEventListener("yt-player-updated", schedule);
  document.addEventListener("fullscreenchange", schedule);
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("popstate", schedule);
  window.addEventListener("pageshow", schedule);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.enabled) {
      enabled = changes.enabled.newValue !== false;
      schedule();
    }
  });
  // Observe from document_start, but honor the saved preference before moving
  // anything. Reconcile on the next frame instead of adding a fixed delay.
  observe();
  chrome.storage.local.get({ enabled: true }).then((settings) => {
    enabled = settings.enabled !== false;
    settingsReady = true;
    schedule();
  }).catch((error) => console.warn("SideComments for YouTube: could not read settings", error));
})();
