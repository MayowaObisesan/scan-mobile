import React, {useRef, useState} from 'react'
import {View, ScrollView, ActivityIndicator, Pressable, Image, Alert} from 'react-native'
import { useRouter } from 'expo-router'
import { useProfile, useUpdateProfile } from '~/hooks/useProfile'
import { Button } from '~/components/ui/button'
import { PageContainer, PageHeader, PageHeading } from '~/components/PageSection'
import { toast } from 'sonner-native'
import { useAuth } from '~/hooks/useAuth'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '~/supabase/client'
import { Text } from '~/components/ui/text'
import EmojiPicker, { EmojiKeyboard } from 'rn-emoji-keyboard'
import {Ionicons} from "@expo/vector-icons";
import { BottomSheet, BottomSheetContent, BottomSheetHeader, BottomSheetTitle } from '~/components/ui/bottom-sheet'
import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { useEmojiAvatar } from '~/hooks/useEmojiAvatar'

export default function DPPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { emoji: localEmoji, saveEmoji, removeEmoji } = useEmojiAvatar()
  const [uploading, setUploading] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null)
  const [isConfirmSheetOpen, setIsConfirmSheetOpen] = useState(false)
  const bottomSheetRef = useRef<BottomSheetModal>(null)


  const { data: profile, isLoading } = useProfile(user?.id!)
  const updateProfileMutation = useUpdateProfile()

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      })

      if (!result.canceled) {
        // await uploadImage(result.assets[0].uri)
        setSelectedImage(result.assets[0].uri)
      }
    } catch (error) {
      toast.error('Error selecting image', {
        description: error instanceof Error ? error.message : 'Something went wrong',
      })
    }
  }

  const uploadImage = async () => {
    if (!selectedImage) return

    try {
      setUploading(true)
      const response = await fetch(selectedImage)
      const blob = await response.blob()
      const fileExt = selectedImage.split('.').pop()
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, blob)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath)

      await updateProfileMutation.mutateAsync({
        userId: user?.id!,
        data: { avatar_url: publicUrl }
      })

      toast.success('Profile picture updated successfully')
      setSelectedImage(null)
    } catch (error) {
      toast.error('Error uploading image', {
        description: error instanceof Error ? error.message : 'Something went wrong',
      })
    } finally {
      setUploading(false)
    }
  }

  // Modify handleEmojiSelect to show preview first
  const handleEmojiSelect = async (emoji: { emoji: string }) => {
    setSelectedEmoji(emoji.emoji)
    setShowEmojiPicker(false)
  }

  // Add new function to confirm emoji selection
  const handleConfirmEmoji = async () => {
    try {
      /*await updateProfileMutation.mutateAsync({
        userId: user?.id!,
        data: { avatar_url: '', emoji_avatar: selectedEmoji }
      })
      toast.success('Profile emoji updated successfully')
      setSelectedEmoji(null)*/

      if (selectedEmoji) {
        const success = await saveEmoji(selectedEmoji)
        if (success) {
          // toast.success('Profile emoji updated successfully')
          setSelectedEmoji(null)
        }
      }
    } catch (error) {
      toast.error('Error updating emoji', {
        description: error instanceof Error ? error.message : 'Something went wrong',
      })
    }
  }

  const handleRemoveAvatar = () => {
    setIsConfirmSheetOpen(true)
  }

  const handleConfirmRemove = async () => {
    try {
      if (profile?.avatar_url) {
        await updateProfileMutation.mutateAsync({
          userId: user?.id!,
          data: { avatar_url: '' }
        })
        toast.success('Profile picture removed successfully')
      } else if (localEmoji) {
        await removeEmoji()
      }
      setIsConfirmSheetOpen(false)
    } catch (error) {
      toast.error('Error removing profile picture/emoji', {
        description: error instanceof Error ? error.message : 'Something went wrong',
      })
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large"/>
      </View>
    )
  }

  return (
    <PageContainer>
      <PageHeader showBackButton>
        <PageHeading>Profile Picture</PageHeading>
      </PageHeader>

      <ScrollView className="flex-1 p-5">
        <View className="items-center mb-8">
          {selectedImage && (
            <View className="items-center">
              <Image
                source={{ uri: selectedImage }}
                className="w-40 h-40 rounded-full mb-4 border-4 border-primary shadow-lg"
              />
              <View className="flex-row space-x-4">
                <Button variant="outline" onPress={() => setSelectedImage(null)}>
                  <Text>Cancel</Text>
                </Button>
                <Button onPress={uploadImage} disabled={uploading}>
                  {uploading ? (
                    <ActivityIndicator size="small" color="white"/>
                  ) : (
                    <Text>Upload</Text>
                  )}
                </Button>
              </View>
            </View>
          )}

          {selectedEmoji && (
            <View className="items-center mb-8">
              <View className="justify-center items-center w-40 h-40 bg-secondary rounded-full mb-4">
                <Text className="items-center h-full align-middle text-8xl">{selectedEmoji}</Text>
              </View>
              <View className="flex-row gap-x-4">
                <Button variant="outline" onPress={() => setSelectedEmoji(null)}>
                  <Text>Cancel</Text>
                </Button>
                <Button onPress={handleConfirmEmoji}>
                  <Text>Use This Emoji</Text>
                </Button>
              </View>
            </View>
          )}

          {(!selectedImage && !selectedEmoji) &&
            <View className={"relative"}>
              <Avatar alt={""} className="w-40 h-40 mb-4 border-4 border-primary shadow-lg">
                  <AvatarImage source={profile?.avatar_url ? {uri: profile.avatar_url} : undefined}/>
                  <AvatarFallback>
                      <Text className="h-full align-middle text-8xl">
                        {localEmoji || profile?.username?.charAt(0)?.toUpperCase()}
                      </Text>
                  </AvatarFallback>
              </Avatar>
              {
                profile?.avatar_url
                && <Button
                      size={"icon"}
                      onPress={handleRemoveAvatar}
                      variant="destructive"
                      className="absolute bottom-4 right-4 rounded-full"
                  >
                      <Text className={"text-secondary"}><Ionicons name={'trash'} size={20}/></Text>
                  </Button>
              }
            </View>
          }
        </View>

        <View className="gap-y-4">
          <Button
            onPress={handleImagePick}
            disabled={uploading}
            className="w-full"
          >
            <Text>Upload Photo</Text>
          </Button>

          <Button
            onPress={() => setShowEmojiPicker(true)}
            variant="outline"
            className="w-full"
          >
            <Text>Use Emoji as Profile Picture</Text>
          </Button>
        </View>

        {showEmojiPicker && (
          <View className="mt-4">
            <EmojiPicker
              onEmojiSelected={handleEmojiSelect}
              open={true}
              onClose={() => setShowEmojiPicker(false)}
              expandable={false}
              defaultHeight={300}
              categoryPosition="top"
              // categoryColor="#007AFF"
              hideHeader
              allowMultipleSelections={false}
            />
          </View>
        )}
      </ScrollView>

      <BottomSheet
        ref={bottomSheetRef}
        open={isConfirmSheetOpen}
        onOpenChange={setIsConfirmSheetOpen}
        snapPoints={['25%']}
      >
        <BottomSheetContent>
          <BottomSheetHeader>
            <BottomSheetTitle>Remove Profile Picture?</BottomSheetTitle>
          </BottomSheetHeader>

          <Text className="text-muted-foreground mb-6">
            Are you sure you want to remove your profile picture or emoji?
          </Text>

          <View className="gap-y-3">
            <Button
              onPress={handleConfirmRemove}
              variant="destructive"
              className="w-full"
            >
              <Text>Remove</Text>
            </Button>

            <Button
              onPress={() => setIsConfirmSheetOpen(false)}
              variant="outline"
              className="w-full"
            >
              <Text>Cancel</Text>
            </Button>
          </View>
        </BottomSheetContent>
      </BottomSheet>
    </PageContainer>
  )
}
