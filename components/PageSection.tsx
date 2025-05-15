import {ActivityIndicator, ScrollView, View} from "react-native";
import * as React from "react";
import {ReactElement} from "react";
import {cn} from "~/lib/utils";
import {Button} from "~/components/ui/button";
import {LucideArrowLeft} from "lucide-react-native";
import {Text} from "~/components/ui/text";
import {Ionicons} from "@expo/vector-icons";
import { ThemedView } from "./ThemedView";
import { router } from "expo-router";

type childrenProps = ReactElement | ReactElement[] | any | any[] | null;

export const CardSectionContainer = ({className, children}: {
  className?: string;
  children: ReactElement | ReactElement[] | null
}) => {
  return (
    <View
      className={cn("flex flex-col rounded-xl pb-4 bg-background dark:bg-base-300", className)}>
      {children}
    </View>
  )
}

export const CardSectionBody = ({className, children}: {
  className?: string;
  children: ReactElement | ReactElement[] | null
}) => {
  return (
    <View
      className={cn("px-4", className)}>
      {children}
    </View>
  )
}

export const PageSectionContainer = ({classes, children}: { classes?: string; children?: ReactElement }) => {
  return (
    <View className={`flex flex-col pt-8 pb-8 ${classes}`}>
      {children}
    </View>
  )
}

export const PageSectionBody = ({classes, children}: { classes?: string; children?: ReactElement }) => {
  return (
    <View className={`${classes}`}>
      {children}
    </View>
  )
}

export const PageContainer = ({ fallback, children }: { fallback?: ReactElement, children: ReactElement | ReactElement[] | any[] }) => {
  return (
    <React.Suspense fallback={fallback || <ActivityIndicator size={"large"}/>}>
      <ThemedView>
        <View className={"flex flex-col w-full h-full"}>
          {children}
        </View>
      </ThemedView>
    </React.Suspense>
  )
}

export const PageHeading = ({ center = false, className, children }: { center?: boolean; className?: string; children: React.Component | React.Component[] | any | any[] }) => {
  return <Text className={cn(center ? "text-center" : "text-left", "font-bold text-2xl", className)}>{children}</Text>
}

export const PageHeader = ({ showBackButton = false, className, children }: { showBackButton?: boolean; className?: string; children: childrenProps }) => {
  return (
    <View className={cn("bg-primary-foreground flex flex-col justify-center h-16 px", className)}>
      {showBackButton ? (
        <View className={"flex flex-row items-center gap-x-4"}>
          <Button className={"flex flex-row items-center rounded-lg"} variant={"ghost"} size={"icon"} onPress={() => router.back()}>
            <Text className={"flex flex-row items-center text-foreground"}><Ionicons name={"arrow-back"} size={24} color={"inherit"} className={"text-foreground"} /></Text>
          </Button>
          {children}
        </View>
      ) : (
        <View className={"flex flex-row flex-1 items-center px-4"}>{children}</View>
      )}
    </View>
  )
}

export const PageBody = ({ className, children }: { className?: string, children: ReactElement | ReactElement[] | any[] }) => {
  return <View className={cn(className, "flex-1")} style={{ width: "100%", maxWidth: "100%" }}>
    {children}
  </View>
}
