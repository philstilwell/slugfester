(() => {
  const mediaPrototype = globalThis.HTMLMediaElement?.prototype;
  if (!mediaPrototype) return;

  const nativePause = mediaPrototype.pause;
  const blockPlayback = (media) => {
    try {
      media.autoplay = false;
      media.muted = true;
      nativePause.call(media);
    } catch {
      // The recovery validator observes the player state and fails closed.
    }
  };

  Object.defineProperty(mediaPrototype, "play", {
    configurable: true,
    value() {
      blockPlayback(this);
      return Promise.resolve();
    }
  });
  Object.defineProperty(mediaPrototype, "autoplay", {
    configurable: true,
    get() {
      return false;
    },
    set() {
      blockPlayback(this);
    }
  });

  globalThis.addEventListener(
    "play",
    (event) => {
      if (event.target instanceof HTMLMediaElement) blockPlayback(event.target);
    },
    true
  );

  const sweep = (root) => {
    if (root instanceof HTMLMediaElement) blockPlayback(root);
    root?.querySelectorAll?.("audio,video").forEach(blockPlayback);
  };
  const beginObservation = () => {
    sweep(document);
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) sweep(node);
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  };
  if (document.documentElement) beginObservation();
  else document.addEventListener("DOMContentLoaded", beginObservation, { once: true });
})();
