// import { Stack } from 'expo-router';
import { Stack } from "expo-router";
import {JsStack} from "~/components/layouts/js-stack";

export const unstable_settings = {
  initialRouteName: 'index',
};


export default function ChatLayout() {
  return <JsStack
    // detachInactiveScreens={false}
    screenOptions={{
      headerShown: false,
      detachPreviousScreen: false,
    }}
  >
    <JsStack.Screen
      name='index'
      options={{
        title: 'Chat',
        headerRight: () => <></>,
        presentation: 'modal'
      }}
    />
  </JsStack>;
}
