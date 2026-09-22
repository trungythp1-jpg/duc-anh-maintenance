if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        "./service-worker.js",
        { scope: "./" }
      );

      console.log(
        "PWA Service Worker registered:",
        registration.scope
      );

      /*
       * Force Safari to check for a newer Service Worker.
       * This is important during DEV because GitHub Pages + iOS
       * can otherwise keep an older worker for a while.
       */
      await registration.update();

      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }
    } catch (error) {
      console.error(
        "PWA Service Worker registration failed:",
        error
      );
    }
  });
}

navigator.serviceWorker?.addEventListener("controllerchange", () => {
  console.log("PWA Service Worker updated.");
});
