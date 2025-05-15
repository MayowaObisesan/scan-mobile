import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import { Buffer } from 'buffer';
import 'react-native-get-random-values'
import 'react-native-reanimated';
import * as Crypto from 'expo-crypto';

if (!global.Buffer) global.Buffer = Buffer;

// https://docs.expo.dev/router/reference/troubleshooting/#expo_router_app_root-not-defined

// Must be exported or Fast Refresh won't update the context
export function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
