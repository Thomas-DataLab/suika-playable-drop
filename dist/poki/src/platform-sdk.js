/**
 * Universal Multi-Platform Game SDK Adapter
 * Unifies mediation across YouTube Playables, CrazyGames SDK (v2 & v3), Poki SDK,
 * and Offline/Standalone fallback.
 */
(function(window) {
  'use strict';

  class PlatformSDKAdapter {
    constructor() {
      this.platform = 'standalone'; // 'youtube' | 'crazygames' | 'poki' | 'standalone'
      this.isInitialized = false;
      this.isAdActive = false;
      this.wasAudioMutedBeforeAd = false;
      this.hasGameReadyCalled = false;
      this.isGameplayRunning = false;
      this._cgInstance = null; // cached CrazyGames instance

      // Detect active platform environment
      this.detectPlatform();
    }

    /**
     * Inspect global window objects to detect active host platform.
     */
    detectPlatform() {
      if (typeof window.ytgame !== 'undefined') {
        this.platform = 'youtube';
      } else if (typeof window.CrazyGames !== 'undefined') {
        this.platform = 'crazygames';
      } else if (typeof window.PokiSDK !== 'undefined') {
        this.platform = 'poki';
      } else {
        this.platform = 'standalone';
      }
      return this.platform;
    }

    /**
     * Get active platform identifier.
     * @returns {string}
     */
    getPlatform() {
      return this.platform;
    }

    /**
     * Initialize platform SDK and notify loading states.
     * @returns {Promise<{platform: string, success: boolean}>}
     */
    async init() {
      if (this.isInitialized) {
        return { platform: this.platform, success: true };
      }

      this.detectPlatform();
      console.log(`[PlatformSDK] Initializing platform: ${this.platform}`);

      try {
        switch (this.platform) {
          case 'poki': {
            if (window.PokiSDK) {
              await window.PokiSDK.init();
              if (typeof window.PokiSDK.gameLoadingFinished === 'function') {
                window.PokiSDK.gameLoadingFinished();
              }
              console.log('[PlatformSDK] Poki SDK initialized & gameLoadingFinished() called.');
            }
            break;
          }

          case 'crazygames': {
            if (window.CrazyGames) {
              if (window.CrazyGames.SDK && typeof window.CrazyGames.SDK.init === 'function') {
                // CrazyGames SDK v3
                await window.CrazyGames.SDK.init();
                this._cgInstance = window.CrazyGames.SDK;
                if (this._cgInstance.game && typeof this._cgInstance.game.loadingStop === 'function') {
                  this._cgInstance.game.loadingStop();
                }
                console.log('[PlatformSDK] CrazyGames SDK v3 initialized.');
              } else if (window.CrazyGames.CrazySDK) {
                // CrazyGames SDK v2
                this._cgInstance = window.CrazyGames.CrazySDK.getInstance();
                await this._cgInstance.init();
                console.log('[PlatformSDK] CrazyGames SDK v2 initialized.');
              }
            }
            break;
          }

          case 'youtube': {
            if (window.ytgame && typeof window.ytgame.gameReady === 'function') {
              window.ytgame.gameReady();
              this.hasGameReadyCalled = true;
              console.log('[PlatformSDK] YouTube Playables gameReady() called.');
            }
            break;
          }

          case 'standalone':
          default: {
            console.log('[PlatformSDK] Standalone / offline mode active.');
            break;
          }
        }
      } catch (err) {
        console.warn(`[PlatformSDK] Error during platform init (${this.platform}):`, err);
      }

      this.isInitialized = true;
      return { platform: this.platform, success: true };
    }

    /**
     * Notify platform that player has started actively playing (e.g. dropped fruit or unpaused).
     */
    gameplayStart() {
      if (this.isGameplayRunning) return;
      this.isGameplayRunning = true;

      try {
        if (this.platform === 'poki' && window.PokiSDK && typeof window.PokiSDK.gameplayStart === 'function') {
          window.PokiSDK.gameplayStart();
        } else if (this.platform === 'crazygames') {
          if (this._cgInstance && this._cgInstance.game && typeof this._cgInstance.game.gameplayStart === 'function') {
            this._cgInstance.game.gameplayStart();
          } else if (this._cgInstance && typeof this._cgInstance.gameplayStart === 'function') {
            this._cgInstance.gameplayStart();
          }
        }
        console.log('[PlatformSDK] gameplayStart() triggered.');
      } catch (e) {
        console.warn('[PlatformSDK] gameplayStart error:', e);
      }
    }

    /**
     * Notify platform that active gameplay stopped (e.g. game over, pause menu).
     */
    gameplayStop() {
      if (!this.isGameplayRunning) return;
      this.isGameplayRunning = false;

      try {
        if (this.platform === 'poki' && window.PokiSDK && typeof window.PokiSDK.gameplayStop === 'function') {
          window.PokiSDK.gameplayStop();
        } else if (this.platform === 'crazygames') {
          if (this._cgInstance && this._cgInstance.game && typeof this._cgInstance.game.gameplayStop === 'function') {
            this._cgInstance.game.gameplayStop();
          } else if (this._cgInstance && typeof this._cgInstance.gameplayStop === 'function') {
            this._cgInstance.gameplayStop();
          }
        }
        console.log('[PlatformSDK] gameplayStop() triggered.');
      } catch (e) {
        console.warn('[PlatformSDK] gameplayStop error:', e);
      }
    }

    /**
     * Celebratory event on major game milestones (e.g. creating Watermelon, 5x combo).
     * @param {number} [intensity=1.0] Value between 0.0 and 1.0
     */
    happyTime(intensity = 1.0) {
      try {
        if (this.platform === 'poki' && window.PokiSDK && typeof window.PokiSDK.happyTime === 'function') {
          window.PokiSDK.happyTime(intensity);
        } else if (this.platform === 'crazygames') {
          if (this._cgInstance && this._cgInstance.game && typeof this._cgInstance.game.happytime === 'function') {
            this._cgInstance.game.happytime();
          } else if (this._cgInstance && typeof this._cgInstance.happytime === 'function') {
            this._cgInstance.happytime();
          }
        }
        console.log(`[PlatformSDK] happyTime(${intensity}) triggered.`);
      } catch (e) {
        console.warn('[PlatformSDK] happyTime error:', e);
      }
    }

    /**
     * Request an Interstitial (Midgame / Commercial Break) ad with safe fallback.
     * @param {Function} [onComplete] Callback invoked when ad finishes, is dismissed, or errors.
     */
    requestInterstitialAd(onComplete) {
      let isCalled = false;
      const safeCallback = () => {
        if (isCalled) return;
        isCalled = true;
        this._restoreAudioAfterAd();
        this.isAdActive = false;
        if (typeof onComplete === 'function') {
          try {
            onComplete();
          } catch (err) {
            console.error('[PlatformSDK] Interstitial callback error:', err);
          }
        }
      };

      this.isAdActive = true;
      this._muteAudioForAd();

      // 1. Poki SDK
      if (this.platform === 'poki' && window.PokiSDK && typeof window.PokiSDK.commercialBreak === 'function') {
        try {
          window.PokiSDK.commercialBreak()
            .then(() => {
              console.log('[PlatformSDK] Poki commercial break finished.');
              safeCallback();
            })
            .catch((err) => {
              console.warn('[PlatformSDK] Poki commercial break failed or skipped:', err);
              safeCallback();
            });
          return;
        } catch (e) {
          console.warn('[PlatformSDK] Poki commercialBreak invocation error:', e);
          safeCallback();
          return;
        }
      }

      // 2. CrazyGames SDK v3 / v2
      if (this.platform === 'crazygames' && this._cgInstance) {
        try {
          // v3
          if (this._cgInstance.ad && typeof this._cgInstance.ad.requestAd === 'function') {
            this._cgInstance.ad.requestAd('midgame', {
              adStarted: () => {
                console.log('[PlatformSDK] CrazyGames v3 midgame ad started.');
              },
              adFinished: () => {
                console.log('[PlatformSDK] CrazyGames v3 midgame ad finished.');
                safeCallback();
              },
              adError: (error) => {
                console.warn('[PlatformSDK] CrazyGames v3 midgame ad error:', error);
                safeCallback();
              }
            });
            return;
          }
          // v2
          if (typeof this._cgInstance.requestAd === 'function') {
            const adCallbacks = {
              adFinished: () => safeCallback(),
              adError: () => safeCallback()
            };
            this._cgInstance.requestAd('midgame', adCallbacks);
            return;
          }
        } catch (e) {
          console.warn('[PlatformSDK] CrazyGames requestAd error:', e);
          safeCallback();
          return;
        }
      }

      // 3. YouTube Playables
      if (this.platform === 'youtube' && window.ytgame && window.ytgame.ads && typeof window.ytgame.ads.requestInterstitialAd === 'function') {
        try {
          const adPromise = window.ytgame.ads.requestInterstitialAd();
          if (adPromise && typeof adPromise.then === 'function') {
            adPromise
              .then(() => {
                console.log('[PlatformSDK] YouTube interstitial ad finished.');
                safeCallback();
              })
              .catch((err) => {
                console.warn('[PlatformSDK] YouTube interstitial ad failed:', err);
                safeCallback();
              });
            return;
          }
        } catch (e) {
          console.warn('[PlatformSDK] YouTube requestInterstitialAd error:', e);
          safeCallback();
          return;
        }
      }

      // 4. Standalone / Offline fallback
      setTimeout(() => {
        console.log('[PlatformSDK] Standalone interstitial pass-through.');
        safeCallback();
      }, 50);
    }

    /**
     * Request a Rewarded Ad.
     * @param {string} rewardId Purpose identifier (e.g. 'revive', 'double_score')
     * @param {Function} [onReward] Callback when user earns the reward.
     * @param {Function} [onDismiss] Callback when ad fails, is skipped, or closed without reward.
     */
    requestRewardedAd(rewardId, onReward, onDismiss) {
      let isSettled = false;
      const handleReward = () => {
        if (isSettled) return;
        isSettled = true;
        this._restoreAudioAfterAd();
        this.isAdActive = false;
        console.log(`[PlatformSDK] Reward granted for '${rewardId}'.`);
        if (typeof onReward === 'function') {
          try {
            onReward();
          } catch (err) {
            console.error('[PlatformSDK] onReward callback error:', err);
          }
        }
      };

      const handleDismiss = () => {
        if (isSettled) return;
        isSettled = true;
        this._restoreAudioAfterAd();
        this.isAdActive = false;
        console.log(`[PlatformSDK] Rewarded ad dismissed without reward for '${rewardId}'.`);
        if (typeof onDismiss === 'function') {
          try {
            onDismiss();
          } catch (err) {
            console.error('[PlatformSDK] onDismiss callback error:', err);
          }
        }
      };

      this.isAdActive = true;
      this._muteAudioForAd();

      // 1. Poki SDK
      if (this.platform === 'poki' && window.PokiSDK && typeof window.PokiSDK.rewardedBreak === 'function') {
        try {
          window.PokiSDK.rewardedBreak()
            .then((success) => {
              if (success) {
                handleReward();
              } else {
                handleDismiss();
              }
            })
            .catch((err) => {
              console.warn('[PlatformSDK] Poki rewardedBreak error:', err);
              handleDismiss();
            });
          return;
        } catch (e) {
          console.warn('[PlatformSDK] Poki rewardedBreak call error:', e);
          handleDismiss();
          return;
        }
      }

      // 2. CrazyGames SDK v3 / v2
      if (this.platform === 'crazygames' && this._cgInstance) {
        try {
          // v3
          if (this._cgInstance.ad && typeof this._cgInstance.ad.requestAd === 'function') {
            this._cgInstance.ad.requestAd('rewarded', {
              adStarted: () => {
                console.log('[PlatformSDK] CrazyGames v3 rewarded ad started.');
              },
              adFinished: () => {
                console.log('[PlatformSDK] CrazyGames v3 rewarded ad finished successfully.');
                handleReward();
              },
              adError: (error) => {
                console.warn('[PlatformSDK] CrazyGames v3 rewarded ad error:', error);
                handleDismiss();
              }
            });
            return;
          }
          // v2
          if (typeof this._cgInstance.requestAd === 'function') {
            this._cgInstance.requestAd('rewarded', {
              adFinished: () => handleReward(),
              adError: () => handleDismiss()
            });
            return;
          }
        } catch (e) {
          console.warn('[PlatformSDK] CrazyGames rewarded ad invocation error:', e);
          handleDismiss();
          return;
        }
      }

      // 3. YouTube Playables Rewarded Ad (if supported)
      if (
        this.platform === 'youtube' &&
        window.ytgame &&
        window.ytgame.ads &&
        typeof window.ytgame.ads.requestRewardedAd === 'function'
      ) {
        try {
          const adPromise = window.ytgame.ads.requestRewardedAd();
          if (adPromise && typeof adPromise.then === 'function') {
            adPromise
              .then(() => handleReward())
              .catch((err) => {
                console.warn('[PlatformSDK] YouTube rewarded ad error:', err);
                handleDismiss();
              });
            return;
          }
        } catch (e) {
          console.warn('[PlatformSDK] YouTube requestRewardedAd error:', e);
          handleDismiss();
          return;
        }
      }

      // 4. Standalone / Test mode fallback: grant reward for testing
      console.log(`[PlatformSDK] Standalone rewarded ad test pass-through for '${rewardId}'.`);
      setTimeout(() => {
        handleReward();
      }, 100);
    }

    /**
     * Mute game audio during ad playbacks if SoundManager is active.
     * @private
     */
    _muteAudioForAd() {
      if (window.SoundManager && typeof window.SoundManager.isMuted === 'function') {
        this.wasAudioMutedBeforeAd = window.SoundManager.isMuted();
        if (!this.wasAudioMutedBeforeAd && typeof window.SoundManager.setMuted === 'function') {
          window.SoundManager.setMuted(true);
        }
      }
    }

    /**
     * Restore game audio state after ad completion.
     * @private
     */
    _restoreAudioAfterAd() {
      if (window.SoundManager && typeof window.SoundManager.setMuted === 'function') {
        if (!this.wasAudioMutedBeforeAd) {
          window.SoundManager.setMuted(false);
        }
      }
    }
  }

  // Export universal singleton instance
  window.PlatformSDK = new PlatformSDKAdapter();
})(window);
