import '~/global.css';

import 'react-native-reanimated';
import {DarkTheme, DefaultTheme, NavigationContainer, Theme, ThemeProvider} from '@react-navigation/native';
import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import * as React from 'react';
import {ActivityIndicator, Platform, View} from 'react-native';
import {NAV_THEME} from '~/lib/constants';
import {useColorScheme} from '~/lib/useColorScheme';
import {PortalHost} from '@rn-primitives/portal';
import {ThemeToggle} from '~/components/ThemeToggle';
import {setAndroidNavigationBar} from '~/lib/android-navigation-bar';
import {Buffer} from "buffer";
import {SafeAreaProvider, SafeAreaView} from "react-native-safe-area-context";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import {QueryClient} from "@tanstack/react-query";
import {Toaster} from "sonner-native";
// import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {PersistQueryClientProvider} from '@tanstack/react-query-persist-client'
import {createAsyncStoragePersister} from '@tanstack/query-async-storage-persister'
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppDataProvider} from "~/contexts/AppContext";
import {SQLiteProvider} from 'expo-sqlite';
import {db, DB_NAME} from "~/db";
import {useMigrations} from "drizzle-orm/expo-sqlite/migrator";
import migrations from "~/drizzle/migrations";
import {Text} from "~/components/ui/text";
import {createNativeStackNavigator} from "@react-navigation/native-stack";
import RootScreen from "~/app/index";
import HomeScreen from "~/app/(tabs)/home/home";
import {JsStack} from "~/components/layouts/js-stack";

/* POLYFILL */
// React Native doesn’t natively support structuredClone, but you can provide a polyfill. Here is the polyfill
if (typeof structuredClone === "undefined") {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Import and initialize the Buffer polyfill
// Assign Buffer to the global scope
if (typeof global.Buffer === "undefined") {
  global.Buffer = Buffer;

  Buffer.prototype.subarray = function subarray(
    begin: number | undefined,
    end: number | undefined
  ) {
    const result = Uint8Array.prototype.subarray.apply(this, [begin, end]);
    Object.setPrototypeOf(result, Buffer.prototype); // Explicitly add the `Buffer` prototype (adds `readUIntLE`!)
    return result;
  };
}

if (!global.Buffer) global.Buffer = Buffer;
/* END POLYFILL */

const LIGHT_THEME: Theme = {
  ...DefaultTheme,
  colors: NAV_THEME.light,
};
const DARK_THEME: Theme = {
  ...DarkTheme,
  colors: NAV_THEME.dark,
};

// For Tanstack react-query init
const queryClient = new QueryClient();
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage
})

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  const hasMounted = React.useRef(false);
  const {colorScheme, isDarkColorScheme} = useColorScheme();
  const [isColorSchemeLoaded, setIsColorSchemeLoaded] = React.useState(false);
  const theme = isDarkColorScheme ? DARK_THEME : LIGHT_THEME
  // const scheme = useColorScheme()
  // const theme = scheme === 'dark' ? darkTheme : lightTheme

  const {error, success} = useMigrations(db, migrations);

  /*useIsomorphicLayoutEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: { isConnected: any; }) => {
      if (state.isConnected) {
        console.log("In layout starting to sync messages")
        syncEngine.syncPendingMessages(); // Auto-sync on reconnect
      }
    });

    return () => unsubscribe();
  }, []);*/

  useIsomorphicLayoutEffect(() => {
    if (hasMounted.current) {
      return;
    }

    if (Platform.OS === 'web') {
      // Adds the background color to the html element to prevent white background on overscroll.
      document.documentElement.classList.add('bg-background');
    }
    setAndroidNavigationBar(colorScheme);
    setIsColorSchemeLoaded(true);
    hasMounted.current = true;
  }, []);

  if (!isColorSchemeLoaded) {
    return null;
  }

  // Handle Migration errors incase local DB migration fails.
  if (error) {
    console.log("ERROR::: Migration Error", error.message)
    return (
      <View>
        <Text>Migration error</Text>
        <Text>Kindly restart app</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View>
        <Text>Migration is in progress...</Text>
        <Text><ActivityIndicator size={"small"}/></Text>
        <Text>Few seconds more...</Text>
      </View>
    );
  }

  return (
    <SQLiteProvider
      useSuspense
      databaseName={DB_NAME}
      // options={{enableChangeListener: true}}
    >
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{persister: asyncStoragePersister}}
      >
        <AppDataProvider>
          <ThemeProvider value={theme}>
            <GestureHandlerRootView>
              {/*<BottomSheetModalProvider>*/}
                <SafeAreaProvider>
                  {/*<PaperProvider theme={theme}>*/}
                  <SafeAreaView
                    className={"flex-auto"}
                    edges={{bottom: 'maximum', top: 'maximum', left: 'off', right: 'off'}}
                    style={{backgroundColor: isDarkColorScheme ? DARK_THEME.colors.background : LIGHT_THEME.colors.background}}
                  >
                    <StatusBar style={isDarkColorScheme ? 'light' : 'dark'}/>
                      <JsStack
                        // detachInactiveScreens={false}
                        screenOptions={{
                          headerShown: false,
                          detachPreviousScreen: false,
                      }}>
                        <Stack.Screen
                          name='index'
                          options={{
                            title: 'Starter Base',
                            headerRight: () => <ThemeToggle/>,
                          }}
                        />
                      </JsStack>
                      <Toaster
                        position="top-center"
                        offset={120}
                        duration={4000}
                        swipeToDismissDirection="left"
                        visibleToasts={3}
                        closeButton
                        autoWiggleOnUpdate="toast-change"
                        theme="system"
                        // icons={{
                        //   error: <Text>💥</Text>,
                        //   loading: <Text>🔄</Text>,
                        // }}
                        toastOptions={{
                          actionButtonStyle: {
                            paddingHorizontal: 20,
                          },
                        }}
                        pauseWhenPageIsHidden
                      />
                    <PortalHost/>
                  </SafeAreaView>
                  {/*</PaperProvider>*/}
                </SafeAreaProvider>
              {/*</BottomSheetModalProvider>*/}
            </GestureHandlerRootView>
          </ThemeProvider>
        </AppDataProvider>
      </PersistQueryClientProvider>
    </SQLiteProvider>
  );
}

export const useIsomorphicLayoutEffect =
  Platform.OS === 'web' && typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;
