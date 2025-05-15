import React, { useState } from 'react'
import { View, TextInput, ActivityIndicator } from 'react-native'
import { PageContainer, PageHeader, PageHeading } from '~/components/PageSection'
import { Text } from '~/components/ui/text'
import { Button } from '~/components/ui/button'
import { useAuth } from '~/hooks/useAuth'
import { useProfile, useUpdateProfile } from '~/hooks/useProfile'
import { useContactInfo } from '~/hooks/useContacts'
import { toast } from 'sonner-native'
import { useIsomorphicLayoutEffect } from "@rn-primitives/hooks"

export default function UsernamePage() {
  const { user } = useAuth()
  const { data: profile, isLoading } = useProfile(user?.id!)
  const updateProfileMutation = useUpdateProfile()
  const { contactInfo } = useContactInfo(profile?.phone)
  const [username, setUsername] = useState('')

  useIsomorphicLayoutEffect(() => {
    if (profile?.username) {
      setUsername(profile.username)
    }
  }, [profile])

  const handleSave = async () => {
    const usernameRegex = /^[a-zA-Z0-9_ ]+$/; // Only allows letters, numbers, and underscores

    if (!username.trim()) {
      toast.error('Username cannot be empty');
      return;
    }

    if (username.length < 3) {
      toast.error('Username must be at least 3 characters long');
      return;
    }

    if (!usernameRegex.test(username)) {
      toast.error('Username can only contain letters, numbers, and underscores');
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        userId: user?.id!,
        data: { username }
      })
      toast.success('Username updated successfully')
    } catch (error) {
      toast.error('Failed to update username', {
        description: error instanceof Error ? error.message : 'Something went wrong'
      })
    }
  }

  const useContactName = () => {
    if (contactInfo?.firstName && contactInfo?.lastName) {
      setUsername(`${contactInfo.firstName} ${contactInfo.lastName}`)
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
        <PageHeading>Change Username</PageHeading>
      </PageHeader>

      <View className="flex-1 p-5 gap-y-16">
        <View className={"gap-y-2"}>
          <Text className="text-xl font-medium mb-1">Username</Text>
          <TextInput
            className="h-24 font-bold text-3xl rounded-2xl p-5 bg-secondary"
            placeholder="Enter your username"
            value={username}
            onChangeText={setUsername}
          />
          <Text className="text-base text-muted-foreground">
            This is the name your contacts will see on your profile.
          </Text>
        </View>

        <View className={"gap-y-4"}>
          <Text>Suggested from your contact info:</Text>
          {contactInfo?.firstName && contactInfo?.lastName && (
            <View>
              <Button
                variant="link"
                onPress={useContactName}
                className="items-start justify-start"
              >
                <Text className="text-left underline">{contactInfo.firstName} {contactInfo.lastName}</Text>
              </Button>
            </View>
          )}
        </View>

        <Button
          onPress={handleSave}
          disabled={updateProfileMutation.isPending || !username.trim() || username === profile?.username}
        >
          {updateProfileMutation.isPending ? (
            <ActivityIndicator size="small" color="white"/>
          ) : (
            <Text>Save Username</Text>
          )}
        </Button>
      </View>
    </PageContainer>
  )
}
