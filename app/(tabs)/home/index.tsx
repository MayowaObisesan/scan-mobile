import {useEffect, useState} from 'react'
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View
} from 'react-native'
import {getChatContacts} from '~/services/contacts'
import {useAuth} from "~/hooks/useAuth";
import {Link, router} from "expo-router";
import {Text} from '~/components/ui/text';
import {PageBody, PageContainer, PageHeader, PageHeading} from "~/components/PageSection";
import {useIsomorphicLayoutEffect} from "@rn-primitives/hooks";
import {LucideX} from "lucide-react-native";
import {Ionicons} from "@expo/vector-icons";
import {useSyncProfile} from "~/hooks/useSyncProfile";
import {useProfile} from "~/hooks/useProfile";
import {useChatContactsContext, useContactsContext, usePhoneContactsContext} from "~/contexts/ContactsContext";
import {useAuthContext} from "~/contexts/AuthContext";
import {syncEngine} from "~/sync/syncEngine";
import {threadRepository} from "~/db/threads";
import {decryptMessageUsingSecret} from "~/lib/crypto";
import {decryptMessage, formatDateShort} from "~/utils";
import {formatDate} from "date-fns";
import { Badge } from '~/components/ui/badge';
import {ContactInfo, useChatContactsProfile} from "~/hooks/useContacts";
import {User} from "@supabase/auth-js";
import {useLiveQuery} from "drizzle-orm/expo-sqlite";
import {db} from "~/db";
import {messages} from "~/db/schema";
import {desc, eq} from "drizzle-orm";
import {useLatestThreadMessage, usePendingThreadMessages} from "~/hooks/useThread";
import {Button} from "~/components/ui/button";
import SolarSearchDuotoneIcon from "~/icon/SearchDuotoneIcon";
import SolarSearchOutlineIcon from "~/icon/SearchOutlineIcon";
import SolarCardSendIcon from "~/icon/CardSendIcon";
import SolarCardReceiveIcon from "~/icon/CardReceiveIcon";
import SolarScannerBoldDuotoneIcon from "~/icon/ScannerBoldDuotoneIcon";
import SolarSendDuotone3Icon from "~/icon/SendDuotone3Icon";
import SolarScannerOutlineDuotoneIcon from "~/icon/ScannerOutlineDuotoneIcon";
import SolarTagPriceIcon from "~/icon/TagPriceIcon";
import {toast} from "sonner-native";
import { LinearGradient } from 'expo-linear-gradient';
import {Separator} from "~/components/ui/separator";

export default function HomeScreen() {
  // const [contacts, setContacts] = useState<{ id: string, name: string, phone: string }[]>([])
  // const [loading, setLoading] = useState(true)
  // const {user, loading: userLoading} = useAuth();
  // useSyncProfile(user?.id!)
  // useProfile(user?.id!)
  const {user, loading: userLoading} = useAuthContext();
  const [searchQuery, setSearchQuery] = useState('')
  // const {chatContacts, isLoading: chatContactsLoading, refetch} = useChatContactsContext();
  // const {data: chatContacts, isLoading: chatContactsLoading, refetch} = useChatContactsProfile(user!);
  const {scanAccounts: chatContacts, isLoading: chatContactsLoading, refetch} = usePhoneContactsContext();
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [appState, setAppState] = useState(AppState.currentState);
  console.log("CHAT CONTACTS", chatContacts?.length);

  if (AppState.currentState === 'active') {
    // syncEngine.syncAllUserMessagesFromServer(user?.id!)
    console.log("HOME APP STATE IS ACTIVE")

    // Store all threads as inactive, and save the threadId's last opened time so it can be used for unread message detection.
    // e.g., AsyncStore.setItem(`threadId:${threadId}`, JSON.stringify({ lastOpened: Date.now() }))
  }

  /*useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
      console.log("HOME PAGE IS IN APP STATE", nextAppState);
      if (nextAppState === 'active') {
        console.log("HOME PAGE IS ACTIVE");
      } else if (nextAppState === 'background') {
        console.log("HOME PAGE IS IN BACKGROUND");
      } else if (nextAppState === 'inactive') {
        console.log("HOME PAGE IS IN INACTIVE");
      }
    });

    return () => {
      subscription.remove();
    };
  }, [appState]);*/

  const exploreItems = [
    /*{ id: '1', title: 'Send', icon: 'send' },
    { id: '2', title: 'Receive', icon: 'download' },
    { id: '3', title: 'Pay', icon: 'card' },
    { id: '4', title: 'Scan', icon: 'scan' },*/
    { id: '1', title: 'Send', icon: <SolarCardSendIcon color={"#666"} height={40} width={40} /> },
    { id: '2', title: 'Receive', icon: <SolarCardReceiveIcon color={"#666"} height={40} width={40} /> },
    { id: '3', title: 'Pay', icon: <SolarTagPriceIcon color={"#666"} height={40} width={40} /> },
    { id: '4', title: 'Scan', icon: <SolarScannerOutlineDuotoneIcon color={"#666"} height={32} width={32} /> },
  ]

  /*useIsomorphicLayoutEffect(() => {
    const fetchContacts = async () => {
      const matched = await getChatContacts()
      setContacts(matched)
      console.log("Matched contacts", matched)
      setLoading(false)
    }

    try {
      fetchContacts()
      console.log("Loading contacts/...")
    } catch (e) {
      console.error("Error fetching contacts")
    }
  }, [])*/

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredContacts = chatContacts?.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone.includes(searchQuery)
  )

  const clearSearch = () => setSearchQuery('')

  function ChatListItem({ item, user }: { item: ContactInfo; user: User; }) {
    const latestThreadMessage = useLatestThreadMessage(item.chatThread?.id!)
    const pendingThreadMessages = usePendingThreadMessages(item.chatThread?.id!)
    const decryptedMessage = latestThreadMessage ? decryptMessage(latestThreadMessage) : "";

    return (
      <Link
        href={{
          pathname: '/chat/[userId]',
          params: {userId: item.id}
        }}
        className="flex-row rounded-2xl"
      >
        <View className={"flex flex-row items-center gap-x-3 p-4"}>
          <View className="h-16 w-16 bg-secondary/80 rounded-full items-center justify-center">
            <Text className="text-lg font-semibold">
              {item.name[0].toUpperCase()}
            </Text>
          </View>
          <View className={"flex-1 gap-y-0.5"}>
            <Text className="text-base font-semibold">{user?.phone === item?.phone ? "Me" : item.name}{/* - {item?.phone}*/}</Text>
            {decryptedMessage &&
                <View className={"flex flex-row justify-start items-center gap-x-1"}>
                    <Badge className={"px-1 bg-blue-600/90 border-0"}>
                        <Text>{latestThreadMessage.localCreatedAt && formatDate(latestThreadMessage.localCreatedAt, "HH:mm aaa")}</Text>
                    </Badge>
                    <Text className="text-gray-500 text-sm flex-1" numberOfLines={1}>{decryptedMessage.replaceAll('\n', '')}</Text>
                </View>
            }
            {user?.phone === item?.phone && !decryptedMessage &&
                <View className={"flex flex-row justify-between items-center gap-x-1"}>
                    <Text className="text-gray-500 text-sm" numberOfLines={1}>Message yourself</Text>
                </View>
            }
          </View>
          <View className={""}>
            <View className={"self-start"}>
              {
                pendingThreadMessages.count > 0 &&
                  <Text className={"font-medium text-sm text-center align-middle rounded-full w-8 h-8 bg-green-500 text-white"}>
                    {pendingThreadMessages.count}
                  </Text>
              }
            </View>
          </View>
        </View>
      </Link>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <View className={"flex-1 flex flex-row justify-between items-center gap-x-3"}>
          <PageHeading>Chats</PageHeading>
          <Link href={"/contacts"}>All Contacts</Link>
        </View>
      </PageHeader>
      {/*<Text className={"leading-loose"} style={{ fontSize: 24, fontWeight: 'bold' }}>Welcome, {user?.username || user?.phone} 👋</Text>*/}
      {/*<Text style={{ fontSize: 18, fontWeight: 'bold' }}>Your ChatFi Contacts</Text>
      <Link href={"/(tabs)/wallet"}>Wallet Page</Link>*/}

      <PageBody>
        <View className="gap-y-8 px-1 py-2">
          <View className={"hidden flex-row justify-around items-center gap-2"}>
            {exploreItems.map((item) => (
              <Pressable
                key={item.id}
                className="items-center"
                onPress={() => {
                  if (item.title === 'Scan') {
                    router.push('/scanner')
                  } else if (item.title === "Pay") {
                    toast.info("Payment feature is coming soon.")
                  } else {
                    router.push(`/wallet/${item.title.toLowerCase()}`)
                  }
                }}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.8 : 1,
                    transform: pressed ? [{ scale: 0.95 }] : [{ scale: 1 }],
                  },
                ]}
              >
                <View className="h-20 w-20 bg-secondary rounded-2xl items-center justify-center mb-2 shadow-md">
                  {/*<Ionicons name={item.icon as any} size={28} color="#333" />*/}
                  {item.icon}
                </View>
                <Text className="text-sm font-medium text-gray-700">{item.title}</Text>
              </Pressable>
            ))}
          </View>

          {/*<Separator />*/}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="px-2"
            contentContainerClassName={"justify-evenly"}
          >
            {/* Add Your Story */}
            <Pressable className="items-center mr-4" onPress={() => toast.info("Coming soon")}>
              <View className="h-20 w-20 bg-secondary rounded-full items-center justify-center mb-1">
                <View className="h-16 w-16 bg-background rounded-full items-center justify-center">
                  <Ionicons name="add" size={24} color="#666" />
                </View>
              </View>
              <Text className="text-xs text-gray-600">Explore</Text>
            </Pressable>

            {/* Sample Stories - Replace with actual data */}
            {chatContacts?.slice(0, 5).map((contact) => (
              <Pressable
                key={contact.id}
                className="items-center mr-4"
                onPress={() => toast.info("Stories coming soon")}
              >
                <LinearGradient
                  colors={['rgba(27,130,237,0.88)', '#19ec69']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  className="h-20 w-20 rounded-full items-center justify-center p-[3px] mb-1"
                  style={{borderRadius: 100}}
                >
                  <View className="h-full w-full bg-background rounded-full items-center justify-center">
                    <Text className="text-lg font-semibold">{contact.name[0].toUpperCase()}</Text>
                  </View>
                </LinearGradient>
                <Text className="text-xs text-gray-600" numberOfLines={1}>
                  {contact.name.split(' ')[0]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View>
            {/*<Text className="text-xl font-semibold mb-4">Your ChatFi Contacts</Text>*/}
            <View className="relative flex flex-row items-center mx-2 px-4 bg-secondary rounded-2xl">
              {/*<Ionicons name={"search"} size={20} />*/}
              <SolarSearchOutlineIcon height={20} color={"#333"} />
              <TextInput
                className="flex-1 h-12 px-2 text-base"
                placeholder="Search contacts..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                clearButtonMode="always" // iOS only
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <Pressable
                  onPress={clearSearch}
                  className="absolute right-3 top-3"
                >
                  <LucideX size={24} color="#666" />
                </Pressable>
              )}
            </View>

            {/*{chatContactsLoading ? (
              <ActivityIndicator size="large" className="mt-8"/>
            ) : (
            )}*/}
            <FlatList
              data={filteredContacts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{paddingVertical: 8}}
              ItemSeparatorComponent={() => (
                <View className="h-[1px] bg-gray-100 my-1"/>
              )}
              /*renderItem={async ({item}) => {
                const latestMessage = await threadRepository.getLatestLocalThreadMessage(item.chatThread?.id!)
                const decryptedMessage = latestMessage ? decryptMessage(latestMessage) : ""
                return (
                  /!*<Pressable
                    className="flex-row items-center p-4 bg-background rounded-xl"
                    style={({pressed}) => [
                      {
                        opacity: pressed ? 0.7 : 1,
                        backgroundColor: pressed ? '#f8f8f8' : '#fff'
                      }
                    ]}
                    onPress={() => router.push(`/chat/${item.id}`)}
                  >*!/
                  <Link
                    href={{
                      pathname: '/chat/[userId]',
                      params: {userId: item.id}
                    }}
                    className="flex-row rounded-2xl"
                  >
                    <View className={"flex flex-row items-center gap-x-3 p-4"}>
                      <View className="h-16 w-16 bg-secondary/80 rounded-full items-center justify-center">
                        <Text className="text-lg font-semibold">
                          {item.name[0].toUpperCase()}
                        </Text>
                      </View>
                      <View className={"gap-y-0.5"}>
                        <Text className="text-base font-semibold">{user?.phone === item?.phone ? "Me" : item.name}</Text>
                        {/!*<Text className="text-gray-500 text-sm">{item.phone}</Text>*!/}
                        {decryptedMessage &&
                          <View className={"flex flex-row justify-between items-center gap-x-1"}>
                            <Badge className={"px-1 bg-blue-600/90 border-0"}>
                                <Text>{formatDate(latestMessage?.localCreatedAt!, "HH:mm aaa")}</Text>
                            </Badge>
                            <Text className="text-gray-500 text-sm" numberOfLines={1}>{decryptedMessage}</Text>
                            {/!*<Text className="text-gray-500 text-sm" numberOfLines={1}>{formatDate(latestMessage?.localCreatedAt!, "HH:mm")}</Text>*!/}
                            {/!*
                            Show the date if the date is yesterday or older
                            <Text className="text-gray-500 text-sm" numberOfLines={1}>{formatDate(latestMessage?.localCreatedAt, "MMM dd, yy HH:mm")}</Text>
                            *!/}
                          </View>
                        }
                        {user?.phone === item?.phone && !decryptedMessage &&
                          <View className={"flex flex-row justify-between items-center gap-x-1"}>
                            <Text className="text-gray-500 text-sm" numberOfLines={1}>Message yourself</Text>
                          </View>
                        }
                      </View>
                    </View>
                  </Link>
                  // </Pressable>
                )
              }}*/
              renderItem={({item}) => <ChatListItem item={item} user={user!} />}
              ListEmptyComponent={() => (
                <View className="items-center justify-center py-8">
                  <Text className="text-gray-500">No contacts found</Text>
                </View>
              )}
              refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
              }
            />
          </View>
        </View>
      </PageBody>
    </PageContainer>
  )
}
