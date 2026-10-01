/**
 * YouTube Playables SDK Adapter
 * Provides safe integration with window.ytgame and fallback for standalone web.
 */
(function(window) {
  'use strict';

  class YTPlayablesAdapter {
    constructor() {
      this.isAvailable = typeof window.ytgame !== 'undefined';
      this.hasGameReadyCalled = false;
    }

    /**
     * Notify YouTube Playables SDK that the game has finished loading and is ready.
     */
    gameReady() {
      if (this.hasGameReadyCalled) return;
      this.hasGameReadyCalled = true;

      try {
        if (window.ytgame && typeof window.ytgame.gameReady === 'function') {
          window.ytgame.gameReady();
          console.log('[YTPlayables] gameReady() called successfully.');
        } else {
          console.log('[YTPlayables] Standalone mode: ytgame.gameReady() not available.');
        }
      } catch (err) {
        console.warn('[YTPlayables] Error calling gameReady():', err);
      }
    }

    /**
     * Request an interstitial ad on game over or between games.
     * @param {Function} [onComplete] Callback when ad finishes or fails/skips.
     */
    requestInterstitialAd(onComplete) {
      const handleDone = () => {
        if (typeof onComplete === 'function') {
          try {
            onComplete();
          } catch (e) {
            console.error('[YTPlayables] onComplete callback error:', e);
          }
        }
      };

      try {
        if (
          window.ytgame &&
          window.ytgame.ads &&
          typeof window.ytgame.ads.requestInterstitialAd === 'function'
        ) {
          const adPromise = window.ytgame.ads.requestInterstitialAd();
          if (adPromise && typeof adPromise.then === 'function') {
            adPromise
              .then(() => {
                console.log('[YTPlayables] Interstitial ad completed.');
                handleDone();
              })
              .catch((err) => {
                console.warn('[YTPlayables] Interstitial ad failed or dismissed:', err);
                handleDone();
              });
            return;
          }
        }
      } catch (err) {
        console.warn('[YTPlayables] Interstitial ad request error:', err);
      }

      // Standalone fallback: execute completion immediately
      handleDone();
    }
  }

  window.YTPlayables = new YTPlayablesAdapter();
})(window);
