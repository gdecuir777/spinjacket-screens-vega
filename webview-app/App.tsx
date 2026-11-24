/*
 * SpinJacket Screens - Vega OS (Fire TV Stick 4K Select and later Vega devices)
 *
 * Thin WebView shell around https://connect.spinjacket.com/tv, plus two native
 * additions the Vega WebView cannot do on its own:
 *
 *   1. PAIRING-TOKEN PERSISTENCE. The Vega WebView does not reliably persist
 *      localStorage across app restarts, so a paired screen would come back
 *      unpaired every launch (and re-pair as a brand-new screen, orphaning its
 *      config). Fix: the /tv page posts its pairing token up to us (onMessage);
 *      we save it in native AsyncStorage, and on the next launch we inject it
 *      back into the page (injectedJavaScriptBeforeContentLoaded) so the screen
 *      boots already paired, as the same screen.
 *
 *   2. KEEP-AWAKE. Vega has no keep-screen-on API for a non-media app; the only
 *      thing that holds the screensaver off is an active native audio/video
 *      session (a WebView <audio>/<video> element does NOT count). Fix: loop a
 *      silent track through the native AudioPlayer while the app is foreground.
 *      This is a community stopgap, not an officially supported mechanism.
 *
 * Drop this in as src/App.tsx. Needs these deps (pinned to the RN 0.83 line,
 * matching this project's react-native 0.83.0 / @amazon-devices/webview ~4.0.0):
 *   npm install @amazon-devices/react-native-w3cmedia@2.3.4-rn-83
 *   npm install @amazon-devices/react-native-async-storage__async-storage@2.1.9000000000-rn-83
 * and the silent clip silence.mp3 beside this file, plus the media services in
 * manifest.toml.
 */
import { WebView } from '@amazon-devices/webview';
import { AudioPlayer } from '@amazon-devices/react-native-w3cmedia';
import AsyncStorage from '@amazon-devices/react-native-async-storage__async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, AppState, Image, type AppStateStatus } from 'react-native';

const TV_URL = 'https://connect.spinjacket.com/tv';
const TOKEN_KEY = 'sj_token';
const DEVICE_KEY = 'sj_device';
const KEEP_AWAKE_START_MS = 5000;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SILENCE = require('./silence.mp3');

// --- Keep-awake: loop a silent native audio track while foreground. ----------
// Vega holds the screensaver off only for an app with an audio/video session.
function useKeepAwake() {
  useEffect(() => {
    let player: any = null;
    let disposed = false;

    const sync = (state: AppStateStatus) => {
      if (!player) return;
      try { if (state === 'active') player.play(); else player.pause(); } catch (e) {}
    };

    const start = setTimeout(() => {
      (async () => {
        try {
          const p: any = new AudioPlayer();
          await p.initialize();
          p.addEventListener('error', () => console.warn('[keep-awake] audio error', p.error));
          p.loop = true;
          // AudioPlayer opens a plain file path; a file:// URI fails.
          p.src = Image.resolveAssetSource(SILENCE).uri.replace(/^file:\/\//, '');
          if (disposed) { try { p.deinitialize(); } catch (e) {} return; }
          player = p;
          sync(AppState.currentState);
        } catch (e) {
          console.warn('[keep-awake] setup failed', e);
        }
      })();
    }, KEEP_AWAKE_START_MS);

    const sub = AppState.addEventListener('change', sync);
    return () => {
      disposed = true;
      clearTimeout(start);
      sub.remove();
      if (player) { try { player.pause(); player.deinitialize(); } catch (e) {} }
    };
  }, []);
}

export const App = () => {
  const [ready, setReady] = useState(false);
  const injectedRef = useRef<string>('');

  useKeepAwake();

  // Load the saved pairing identity, then mount the WebView with it injected so
  // the page boots already paired.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let token: string | null = null;
      let device: string | null = null;
      try { token = await AsyncStorage.getItem(TOKEN_KEY); } catch (e) {}
      try { device = await AsyncStorage.getItem(DEVICE_KEY); } catch (e) {}
      injectedRef.current =
        'window.__SJ_NATIVE_TOKEN=' + JSON.stringify(token || '') + ';' +
        'window.__SJ_NATIVE_DEVICE=' + JSON.stringify(device || '') + ';true;';
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // The page posts its pairing token up here; persist it natively.
  const onMessage = (event: any) => {
    try {
      const raw = (event && event.nativeEvent && event.nativeEvent.data) || '{}';
      const data = JSON.parse(raw);
      if (data.type === 'sj-token') {
        if (data.token) AsyncStorage.setItem(TOKEN_KEY, String(data.token)).catch(() => {});
        if (data.device_id) AsyncStorage.setItem(DEVICE_KEY, String(data.device_id)).catch(() => {});
      } else if (data.type === 'sj-untoken') {
        AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
        AsyncStorage.removeItem(DEVICE_KEY).catch(() => {});
      }
    } catch (e) {}
  };

  if (!ready) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: TV_URL }}
        hasTVPreferredFocus={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowSystemKeyEvents={true}
        injectedJavaScriptBeforeContentLoaded={injectedRef.current}
        onMessage={onMessage}
        style={styles.webview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  webview: { flex: 1 },
});
