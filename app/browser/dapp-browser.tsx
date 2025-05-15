import { WebView } from 'react-native-webview'
import {ActivityIndicator, View} from 'react-native'
import { useEffect, useRef } from 'react'
import { getActiveWallet } from '~/solana/wallet'
import {useLocalSearchParams} from "expo-router";
import {Text} from "~/components/ui/text";

export default function DAppBrowserScreen() {
  const {internallyPassedUrl} = useLocalSearchParams()
  const webviewRef = useRef(null)
  const urlToFetch = internallyPassedUrl || 'https://feedbacks-rr.vercel.app';

  useEffect(() => {
    const injectWalletProvider = async () => {
      const wallet = await getActiveWallet()

      const injectedScript = `
        window.solana = {
          isPhantom: true,
          publicKey: '${wallet?.publicKey.toBase58()}',
          connect: () => Promise.resolve({ publicKey: '${wallet?.publicKey.toBase58()}' }),
          disconnect: () => Promise.resolve(),
          signMessage: (msg) => {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              method: 'signMessage',
              message: msg
            }))
          },
          signTransaction: (tx) => {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              method: 'signTransaction',
              transaction: tx
            }))
          }
        }
        true;
      `
      webviewRef.current?.injectJavaScript(injectedScript)
    }

    injectWalletProvider()
  }, [])

  const handleMessage = async (event: any) => {
    const data = JSON.parse(event.nativeEvent.data)
    const wallet = await getActiveWallet()

    if (data.method === 'signMessage') {
      const msg = new TextEncoder().encode(data.message)
      const sig = await wallet?.sign(msg)
      webviewRef.current?.injectJavaScript(`
        window.dispatchEvent(new CustomEvent('messageSigned', {
          detail: '${Buffer.from(sig).toString('base64')}'
        }));
      `)
    }

    if (data.method === 'signTransaction') {
      console.log('🔐 Intercepted tx for signing', data.transaction)
      // You could deserialize and send it via your wallet logic
    }
  }

  if (!urlToFetch) {
    return <View>
      <ActivityIndicator size={"large"} />
      <Text className={"text-base"}>Loading web page</Text>
    </View>
  }

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webviewRef}
        // source={{ uri: 'https://jup.ag' }} // Example DApp
        source={{ uri: urlToFetch }} // Example DApp
        onMessage={handleMessage}
        originWhitelist={['*']}
        javaScriptEnabled
        injectedJavaScriptBeforeContentLoaded={''}
      />
    </View>
  )
}
