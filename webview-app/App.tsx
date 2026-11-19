// SpinJacket Screens for Vega OS.
// A thin WebView wrapper around the existing /tv display page, the same job the
// Android "SpinJacket Screens" app does. The /tv page pairs with a code and
// renders whatever the venue brain sends; this app just hosts it full screen.
//
// NOTE: wiring this into the generated project (entry point / how index.js
// registers the component) is finalized in Phase 2 once we see the real
// scaffold layout from the first CI run.
import { WebView } from '@amazon-devices/webview';
import * as React from 'react';
import { useRef } from 'react';
import { View } from 'react-native';

const TV_URL = 'https://connect.spinjacket.com/tv';

export const App = () => {
  const webRef = useRef(null);
  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <WebView
        ref={webRef}
        style={{ flex: 1, backgroundColor: '#000000' }}
        source={{ uri: TV_URL }}
        hasTVPreferredFocus={true}
        javaScriptEnabled={true}
        allowSystemKeyEvents={true}
        onError={(e) => console.log('SpinJacket webview error:', e && e.nativeEvent && e.nativeEvent.url)}
      />
    </View>
  );
};

export default App;
