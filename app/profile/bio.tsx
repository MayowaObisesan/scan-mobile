import React, { useState } from 'react'
import { View, ScrollView, TextInput, ActivityIndicator, Pressable } from 'react-native'
import {useLocalSearchParams, useRouter} from 'expo-router'
import { useProfile, useUpdateProfile } from '~/hooks/useProfile'
import { Button } from '~/components/ui/button'
import { PageContainer, PageHeader, PageHeading } from '~/components/PageSection'
import { toast } from 'sonner-native'
import { useAuth } from '~/hooks/useAuth'
import { cn } from '~/lib/utils'
import OpenAI from 'openai';
import {Text} from '~/components/ui/text'
import {useIsomorphicLayoutEffect} from "@rn-primitives/hooks";
import {GoogleGenerativeAI} from "@google/generative-ai";

const HOBBIES = [
  'Reading', 'Writing', 'Gaming', 'Cooking', 'Travel',
  'Photography', 'Music', 'Sports', 'Art', 'Technology',
  'Fitness', 'Movies', 'Dancing', 'Hiking', 'Gardening'
]

export default function BioPage() {
  const {generatedBio: AIgeneratedBio} = useLocalSearchParams()
  // console.log("Draft message from AI", AIgeneratedBio);

  const { user } = useAuth()
  const router = useRouter()
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([])
  const [bio, setBio] = useState<string>(AIgeneratedBio?.toString() || '');
  const [isGenerating, setIsGenerating] = useState(false)

  const { data: profile, isLoading } = useProfile(user?.id!)
  const updateProfileMutation = useUpdateProfile()

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true // Required for React Native
  })

  // Replace the OpenAI initialization with Gemini
  const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY!)

  useIsomorphicLayoutEffect(() => {
    if (profile?.bio) {
      setBio(profile.bio)
    }
  }, [profile])

  const generateFakeAIBio = async () => {
    if (selectedHobbies.length === 0) {
      toast.error('Please select at least one hobby')
      return
    }

    setIsGenerating(true)
    try {
      // Mock AI response - replace with actual AI integration
      const aiBio = `Enthusiastic ${selectedHobbies.slice(0, 3).join(', ')} enthusiast. 
        Always excited to explore new opportunities and connect with like-minded people.`
      setBio(aiBio)
    } catch (error) {
      toast.error('Failed to generate bio')
    } finally {
      setIsGenerating(false)
    }
  }

  const generateAIBioOpenAI = async () => {
    if (selectedHobbies.length === 0) {
      toast.error('Please select at least one hobby')
      return
    }

    setIsGenerating(true)
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
          {
            role: "system",
            content: "You are a professional bio writer. Create engaging, concise personal bios."
          },
          {
            role: "user",
            content: `Create a catchy, engaging bio (max 150 characters) for someone who enjoys ${selectedHobbies.join(', ')}. Make it personal and creative.`
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      })

      const generatedBio = completion.choices[0]?.message?.content?.trim()
      if (generatedBio) {
        setBio(generatedBio)
      } else {
        throw new Error('No bio generated')
      }
    } catch (error) {
      console.error('Error generating AI bio:', error)
      toast.error('Failed to generate bio', {
        description: error instanceof Error ? error.message : 'Something went wrong'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const generateAIBio = async () => {
    if (selectedHobbies.length === 0) {
      toast.error('Please select at least one hobby')
      return
    }

    setIsGenerating(true)
    try {
      // Initialize Gemini model
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

      const prompt = `Create a catchy, engaging bio (max 150 characters) for someone who enjoys ${selectedHobbies.join(', ')}. Make it personal and creative.`

      const result = await model.generateContent(prompt)
      const response = await result.response
      const generatedBio = response.text()

      if (generatedBio) {
        setBio(generatedBio)
      } else {
        throw new Error('No bio generated')
      }
    } catch (error) {
      console.error('Error generating AI bio:', error)
      toast.error('Failed to generate bio', {
        description: error instanceof Error ? error.message : 'Something went wrong'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        userId: user?.id!,
        data: { bio }
      })
      toast.success('Bio updated successfully')
    } catch (error) {
      toast.error('Failed to update bio', {
        description: error instanceof Error ? error.message : 'Something went wrong'
      })
    }
  }

  const toggleHobby = (hobby: string) => {
    setSelectedHobbies(prev =>
      prev.includes(hobby)
        ? prev.filter(h => h !== hobby)
        : [...prev, hobby]
    )
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
        <PageHeading>Edit Bio</PageHeading>
      </PageHeader>

      <View className="flex-1 gap-y-24 p-5">
        <View className={"my-4"}>
          <View>
            <Text className="text-xl font-medium mb-1">Your Bio</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              className="font-normal text-xl border border-border rounded-lg p-3 bg-background h-48"
              placeholder="Write about yourself or use AI-generated bio"
              placeholderClassName={"font-semibold text-xl"}
              textAlignVertical="top"
            />
          </View>

          <Button
            onPress={handleSave}
            disabled={updateProfileMutation.isPending || !bio.trim()}
            className="mt-4"
          >
            {updateProfileMutation.isPending ? (
              <ActivityIndicator size="small" color="white"/>
            ) : (
              <Text>Save Bio</Text>
            )}
          </Button>
        </View>

        <View className="gap-y-6">
          <View>
            <Text className="text-base font-semibold mb-4">Select Your Hobbies</Text>
            <View className="flex-row flex-wrap gap-2">
              {HOBBIES.map(hobby => (
                <Pressable
                  key={hobby}
                  onPress={() => toggleHobby(hobby)}
                  className={cn(
                    "px-3 py-2 rounded-full border",
                    selectedHobbies.includes(hobby)
                      ? "bg-primary border-primary"
                      : "border-border"
                  )}
                >
                  <Text className={cn(selectedHobbies.includes(hobby) ? "text-white" : "", "font-medium text-xs")}>
                    {hobby}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Button
            onPress={generateAIBio}
            disabled={isGenerating || selectedHobbies.length === 0}
            className="mb-4"
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="white"/>
            ) : (
              <Text>Generate AI Bio</Text>
            )}
          </Button>
        </View>
      </View>
    </PageContainer>
  )
}
