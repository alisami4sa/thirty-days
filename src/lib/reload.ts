/** Soft: refetch app data. Hard: drop SW/cache and reload (for new deploys). */

export async function softRefresh(refresh: () => Promise<void>) {
  await refresh();
}

export async function hardReloadApp() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* still reload */
  }
  window.location.reload();
}
