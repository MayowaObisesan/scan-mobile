import {useState} from 'react'
import {ActivityIndicator, FlatList, TouchableOpacity, View} from 'react-native'
import {searchUsers, UserProfile} from '~/services/search'
import {router} from "expo-router";
import {Text} from '~/components/ui/text';
import {PageBody, PageContainer, PageHeader, PageHeading} from '~/components/PageSection';
import {AIInputBox2} from '~/components/AIInputBox2';
import {Badge} from "~/components/ui/badge";
import {processAICommand} from '~/utils/ai-search-functions';
import {toast} from 'sonner-native';
import {threadRepository} from "~/db/threads";
import {useAuthContext} from "~/contexts/AuthContext";
import {cn} from "~/lib/utils";

export default function SearchScreen() {
  const {user} = useAuthContext();
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [aiCommandLoading, setAiCommandLoading] = useState(false)
  const [aiResponse, setAIResponse] = useState<{ type: string, content: any, recipient?: { id: string, username: string} } | null>(null);

  const handleAICommand = async (text: string) => {
    try {
      setAiCommandLoading(true);
      const result = await processAICommand(text);
      setAIResponse(result);
      console.log("AI Response", result);

      switch (result.type) {
        case 'bio':
          // Navigate to bio page with generated content
          router.push({
            pathname: '/profile/bio',
            params: {generatedBio: result.content}
          });
          break;
        case 'chat':
          // Handle chat composition
          // Get the content of the chat from result.content
          // Get a name from the instruction to the AI
          // Get the userId of the recipient of the chat from the name of the recipient passed to AI
          // router.push({
          //   pathname: '/chat/new',
          //   params: {draftMessage: result.content}
          // });
          const threadData = await threadRepository.getThreadByPhoneNumber(user!, result.recipient?.userData.phone);
          console.log('SEARCH SCreen - threadData', threadData);
          const userId = threadData?.user1Id === user?.id ? threadData?.user2Id : threadData?.user1Id;
          router.push({
            pathname: `/chat/${[userId]}`,
            params: {
              draftMessage: result.content,
              username: result.recipient.name
            }
          });
          break;
        case 'search':
          // Display search results
          setResults(result.content);
          break;
      }
    } catch (error) {
      console.error('AI processing error:', error);
      toast.error('Failed to process AI command');
    } finally {
      setAiCommandLoading(false);
    }
  };

  const handleSearch = async (text: string) => {
    setQuery(text)
    if (text.length < 2) return setResults([])

    setLoading(true)
    const res = await searchUsers(text)
    setResults(res)
    setLoading(false)
  }

  return (
    <PageContainer>
      {aiCommandLoading && (
        <View style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(255,255,255,0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10
        }}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      )}

      {/*<TextInput
        value={query}
        onChangeText={handleSearch}
        placeholder="Search by username or phone"
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 10,
          borderRadius: 10,
          marginTop: 12
        }}
      />*/}

      <PageBody className={cn("gap-y-4", !query.trim() ? "flex-1 justify-center" : "")}>
        <View className={"justify-center items-center w-full px-2"}>
          <PageHeading className={"py-2"}>
            Explore and Interact
          </PageHeading>
          <Text className={"text-center px-8"} style={{fontSize: 14}}>Search for users, ask AI questions, or explore new possibilities with ease.</Text>
        </View>
        <View className={cn("p-2", !query.trim() ? "gap-y-8" : "")}>
          <AIInputBox2
            value={query}
            onChangeText={handleSearch}
            // placeholder={"I can help you with anything..."}
            placeholder="Try: 'Generate a bio about a tech enthusiast'"
            onSubmitEditing={() => handleAICommand(query)}
          />

          {!query.trim() && <View>
            <Text className={"font-medium text-xl text-center"}>AI is here to help you</Text>
            <View className={"flex flex-row flex-wrap justify-center gap-2 my-2"}>
              <Badge className={"bg-black dark:bg-secondary py-1"} variant={"default"}>
                <Text className={"text-base"}>Improve your bio from a prompt</Text>
              </Badge>
              <Badge className={"bg-black dark:bg-secondary py-1"} variant={"default"}>
                <Text className={"text-base"}>Compose chats using AI</Text>
              </Badge>
              <Badge className={"bg-black dark:bg-secondary py-1"} variant={"default"}>
                <Text className={"text-base"}>Generate Images for your status</Text>
              </Badge>
              <Badge className={"bg-black dark:bg-secondary py-1"} variant={"default"}>
                <Text className={"text-base"}>Search contacts</Text>
              </Badge>
              <Badge className={"bg-black dark:bg-secondary py-1"} variant={"default"}>
                <Text className={"text-base"}>Make payments</Text>
              </Badge>
              <Badge className={"bg-black dark:bg-secondary py-1"} variant={"default"}>
                <Text className={"text-base"}>Schedule Payments</Text>
              </Badge>
              <Badge className={"bg-black dark:bg-secondary py-1"} variant={"default"}>
                <Text className={"text-base"}>Send payment links for future payments</Text>
              </Badge>
            </View>
          </View>}
        </View>

        {results.length > 0 ? (
          <View className={"p-2"}>
            <Text className={"font-medium text-lg"}>Chats contacts</Text>

            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={({item}) => (
                <TouchableOpacity
                  onPress={() => {
                    // TODO: route to chat screen with item
                    alert(`Open chat with ${item.username || item.phone}`)
                    router.push(`/chat/${item.id}`)
                  }}
                  style={{
                    padding: 12,
                    borderBottomColor: '#eee',
                    borderBottomWidth: 1
                  }}
                >
                  <Text style={{fontWeight: 'bold'}}>{item.username || item.phone}</Text>
                  <Text style={{color: 'gray'}}>{item.phone}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        ) : (
          query.length > 1 && !loading && <Text className={"text-lg text-center text-muted-foreground"} style={{marginTop: 20}}>
              No contacts found.
          </Text>
        )}
      </PageBody>
    </PageContainer>
  )
}
