/* Uygulama başlangıcı, geri tuşu, süre takibi. */
window.K = window.K || {};
(function () {
  const { R } = K.UI;
  let lastInteract = Date.now();
  ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, () => { lastInteract = Date.now(); K.Sfx.unlock(); }, { passive: true }));
  document.addEventListener('pointerdown', (e) => {
    const s = K.Store.s;
    if (s.settings.vibrate && e.target.closest && e.target.closest('button')) K.N.vibrate(12);
  }, { passive: true });
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  window.App = {
    onBack() {
      if (K.UI.closeTopModal()) return true;
      if (R.cur && R.cur.onBack && R.cur.onBack()) return true;
      if (R.cur && R.cur.fn === K.Screens.rest) return false;
      if (R.stack.length) { R.back(); return true; }
      K.UI.confirm('Çıkış', 'Uygulamadan çıkmak istiyor musun?', 'Çık', 'Kal').then((yes) => { if (yes) { K.Store.save(true); K.N.exitApp(); } });
      return true;
    },
    onPause() { K.Speech.cancelAll(); K.Store.save(true); },
    async openUpdate() { if (await K.UI.parentGate()) R.go(K.Screens.parent, { focus: 'update' }); },
    onResume() { checkLimit(); },
  };

  function checkLimit() {
    if (K.Store.limitReached() && R.cur && R.cur.fn !== K.Screens.rest && R.cur.fn !== K.Screens.parent) {
      R.stack = [];
      R.go(K.Screens.rest, {}, { replace: true });
    }
  }
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - lastInteract > 120000) return;
    K.Store.tick(15);
    checkLimit();
  }, 15000);

  async function boot() {
    try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]); } catch (e) {}
    if (K.Store.limitReached()) R.go(K.Screens.rest);
    else R.go(K.Screens.home);
    // Güncellemeden sonra ilk açılışta haber ver
    const st = K.N.updStatus();
    if (st && st.installedName) {
      const s = K.Store.s;
      if (s.lastVersion && s.lastVersion !== st.installedName) setTimeout(() => K.UI.toast(`🎉 Uygulama güncellendi: sürüm ${st.installedName}`, 4000), 1500);
      s.lastVersion = st.installedName; K.Store.save();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
