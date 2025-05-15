import { View } from "react-native";

export function ProfileSkeleton() {
  return (
    <View className="animate-pulse">
      <View className="w-48 h-48 rounded-full bg-gray-200"/>
      <View className="w-32 h-6 mt-4 bg-gray-200 rounded"/>
      {/* Add more skeleton UI elements */}
    </View>
  )
}
