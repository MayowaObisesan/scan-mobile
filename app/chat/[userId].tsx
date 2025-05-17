import React, {memo, useCallback, useEffect, useRef, useState} from 'react'
import {
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
  FlatList,
  Image,
  ImageBackground,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import {useLocalSearchParams} from 'expo-router'
import {sendSol} from '~/solana/wallet'
import {ChatBubble} from '~/components/ChatBubble'
import * as ImagePicker from 'expo-image-picker'
import {Picker as EmojiPicker} from 'emoji-mart-native'
import {PageBody, PageContainer, PageHeader, PageHeading} from "~/components/PageSection";
import {Avatar, AvatarFallback, AvatarImage} from "~/components/ui/avatar";
import {fetchProfile, useProfile} from "~/hooks/useProfile";
import {copyStringToClipboard, shortenAddress} from "~/utils";
import ChatInput from "~/components/chats/ChatInput";
import {Audio} from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import {PaymentFormData} from '~/components/chats/payments/PaymentFormSheet'
import {PublicKey} from '@solana/web3.js'
import {ChatMessageType, PaymentStatus, ReadStatus, SyncStatus} from "~/types/enums";
import {
  useChatMessages,
  useCreateMessage,
  useGetMessagesUsingAsyncStore,
  useRealTimeChatInsert
} from "~/hooks/useChatMessages";
import {ContactInfo, useContactInfo} from "~/hooks/useContacts";
import {Skeleton} from '~/components/ui/skeleton'
import {useThread} from "~/hooks/useThread";
import {useRealTimeWallets} from "~/hooks/useWallets";
import {ChatMessagesWithDecryptedMessage, Profiles} from "~/types";
import {Text} from "~/components/ui/text"
import {ThemedView} from "~/components/ThemedView";
import {ChatsProvider, useChatsContext} from "~/contexts/ChatsContext";
import {useWalletContext} from "~/contexts/WalletContext";
import {useAuthContext} from "~/contexts/AuthContext";
import {useProfileContext} from "~/contexts/ProfileContext";
import {useIsomorphicLayoutEffect} from "@rn-primitives/hooks";
import {User} from "@supabase/auth-js";
import * as Crypto from "expo-crypto";
import {toast} from "sonner-native";
import {Message, MessageWithDecryptedMessage} from "~/db/schema";
import {FlashList} from "@shopify/flash-list";
import {LinearGradient} from "expo-linear-gradient";
import {BottomSheetComponent, BottomSheetContent, BottomSheetHeader, BottomSheetTitle} from "~/components/ui/bottom-sheet-component";
// import {BottomSheetModal, BottomSheetView} from "@gorhom/bottom-sheet";
import {Button} from "~/components/ui/button";
import {Ionicons} from "@expo/vector-icons";
import {LucidePin, LucideTrash, LucideTrash2} from "lucide-react-native";
import {Separator} from "~/components/ui/separator";
import {syncEngine} from "~/sync/syncEngine";
import ReanimatedSwipeable from "react-native-gesture-handler/src/components/ReanimatedSwipeable";
import {Swipeable} from "react-native-gesture-handler";
import AsyncStorage from "expo-sqlite/kv-store";
import {threadRepository} from "~/db/threads";
import { Contact } from 'expo-contacts'

/*import { debounce } from '~/utils/debounce';

const handleSearch = debounce(async (text: string) => {
  if (text.length < 2) {
    setResults([]);
    return;
  }

  setLoading(true);
  const results = await searchContacts(text, true, 1, 10);
  setResults(results);
  setLoading(false);
}, 300); // 300ms debounce delay

<TextInput
  placeholder="Search contacts"
  value={query}
  onChangeText={(text) => {
    setQuery(text);
    handleSearch(text);
  }}
/>*/

export default function ChatPage() {
  const {user} = useAuthContext()
  const {userId} = useLocalSearchParams<{ userId: string }>()
  const {data: recipientProfile} = useProfile(userId);
  console.log("User ID is", userId);
  const {data: threadId, isLoading: threadIdLoading, error: threadIdError} = useThread(userId);
  // console.log("Thread Id", threadIdLoading, threadId, userId);
  useRealTimeChatInsert(user?.id!, threadId)
  const {messages: chatMessages} = useChatMessages({threadId, enableDecryption: true});
  const {data: contactInfo, isLoading: contactInfoLoading} = useContactInfo(recipientProfile?.phone!);
  console.log("loading states", threadIdLoading, contactInfoLoading, recipientProfile?.phone);

  /*const {data: cachedMessages} = useGetMessagesUsingAsyncStore(threadId);
  console.log("cachedMessages", cachedMessages.length);*/

  if (AppState.currentState === "active") {
    threadRepository.saveThreadIdToKVStore(threadId);
  }

  if (AppState.isAvailable) {
    console.log("App State is available, user Id", userId);
  }

  /*AppState.addEventListener('change', (state) => {
    console.log("CHAT PAGE IS IN STATE", state);
    if (state === 'active') {
      console.log("CHAT PAGE IS ACTIVE", threadId);
      // e.g., AsyncStore.setItem(`threadId:${threadId}`, JSON.stringify({ lastOpened: Date.now() }))
    } else {
      console.log("CHAT PAGE IS NOT ACTIVE");
    }
  })*/

  /*AppState.addEventListener('blur', (state) => {
    console.log("CHAT PAGE IS IN BLUR");
    if (state === 'inactive') {
      console.log("CHAT PAGE IS IN INACTIVE", threadId);
    }
  })

  if (AppState.currentState === "background") {
    console.log("CHAT PAGE IS IN BACKGROUND", threadId);
  }

  if (AppState.currentState === "active") {
    console.log("CHAT PAGE IS ACTIVE", threadId);
    // e.g., AsyncStore.setItem(`threadId:${threadId}`, JSON.stringify({ lastOpened: Date.now() }))
  } else {
    console.log("CHAT PAGE IS NOT ACTIVE");
  }*/

  /*if (threadIdLoading || contactInfoLoading) {
    return <ThemedView>
      <ActivityIndicator/>
      <Text>Loading your chats...</Text>
    </ThemedView>
  }*/

  if (threadIdError) {
    return <View>
      <Text className={"text-3xl"}>🙄</Text>
      <Text>Error occurred while Loading your chats...</Text>
    </View>
  }

  return (
    <ChatsProvider authUser={user!} threadId={threadId}>
      <ChatScreen sender={user!} recipient={recipientProfile} threadId={threadId!} messages={chatMessages!}
                  contactInfo={contactInfo!}/>
    </ChatsProvider>
  )
}

function ChatScreen({sender, recipient, threadId, messages, contactInfo}: {
  sender: User,
  recipient: Profiles,
  threadId: string,
  messages: MessageWithDecryptedMessage[],
  contactInfo: Contact & { phone: string }
}) {
  const {draftMessage: AIDraftMessage} = useLocalSearchParams()
  useRealTimeWallets();
  // console.log("Chat Screen latest message", messages[0]);
  const recipientId = recipient?.id;
  const {
    createPayment,
    updatePayment,
    deleteMessage,
    getMessages,
    handleCreateMessage,
    updateMessage
  } = useChatsContext()
  const createMessage = useCreateMessage()
  // const {messages: chatMessages} = useChatMessages({threadId, enableDecryption: true});
  const chatMessages = messages;
  // const chatMessages = [];
  // const {} = getMessages(threadId)
  // const {data: chatMessages} = getMessages;
  // console.log("get messages", chatMessages);
  const {activeWallet, walletsList} = useWalletContext()
  const {profile, isLoading: profileLoading} = useProfileContext();
  // console.log("Profile is::", profile)
  // const { contactInfo, isLoading: contactInfoLoading } = useContactInfo(recipient?.phone);
  const [text, setText] = useState('')
  // Replace the text state with a ref
  const textInputRef = useRef('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const recordingTimerRef = useRef<NodeJS.Timeout>();
  const sendNewMessageAnimation = useRef(false);
  const chatPressOptionsSheetRef = useRef(null);
  const currentChatBubbleRef = useRef<Partial<MessageWithDecryptedMessage> | null>(null);
  const [showChatOptionsSheet, setShowChatOptionsSheet] = useState<boolean>(false);

  // Add these state variables at the start of ChatScreen component:
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [isPageActive, setIsPageActive] = useState<boolean>(true);
  const [recipientServerProfile, setRecipientServerProfile] = useState<Profiles | null>(null);

  useIsomorphicLayoutEffect(() => {
    async function _fetchProfile() {
      const result = await fetchProfile(recipient.id);
      setRecipientServerProfile(result);
    }

    _fetchProfile();
  }, [threadId]);

  // Add this useEffect in the ChatScreen component:
  /*useIsomorphicLayoutEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        setIsPageActive(true);
        console.log("CHAT SCREEN IS ACTIVE", threadId);
        // Update thread last opened time
        /!*AsyncStorage.setItem(
          `thread:${threadId}`,
          JSON.stringify({ lastOpened: Date.now() })
        );*!/
        // Mark messages as read
        /!*messages.forEach(msg => {
          if (msg.senderId !== sender.id && msg.readStatus === ReadStatus.pending) {
            updateMessage({
              id: msg.id,
              readStatus: ReadStatus.read
            });
          }
        });*!/
      } else {
        setIsPageActive(false);
        // Handle inactive/background state
        console.log(`Chat thread ${threadId} went to ${nextAppState}`);
      }
    });

    // Set initial active state
    setIsPageActive(appState === 'active');

    return () => {
      subscription.remove();
    };
  }, [threadId]);*/

  /*useIsomorphicLayoutEffect(() => {
    if (isPageActive) {
      console.log("PAGE IS ACTIVE")
    } else {
      console.log("PAGE IS INACTIVE");
    }
  }, [isPageActive])*/

  // Chat Screen States
  const flatListRef = useRef<FlatList>(null);
  const [contentVerticalOffset, setContentVerticalOffset] = useState(0);

  // const [chatMessages, setChatMessages] = useState<ChatMessagesWithDecryptedMessage[]>([])
  // const [isLoading, setIsLoading] = useState(false)

  // Load thread and messages
  /*useIsomorphicLayoutEffect(() => {
    const loadChatData = async () => {
      try {
        setIsLoading(true);
        // Get or create thread
        // const threadId = await getCachedThread(userId);
        // if (!threadId) return;

        // Get cached messages
        // const cachedMessages = await getCachedMessages(threadId);
        const {data: cachedMessages} = await getMessages(threadId);
        setChatMessages(cachedMessages);
      } catch (error) {
        console.error('Error loading chat data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChatData();
  }, [userId]);*/

  /*const load = async () => {
    // const wallets = await getWallets()
    // setMyId(wallets[0].publicKey.toBase58())
    const msgs = getMessages(userId)
    setMessages(msgs)

    // const _contactInfo = await getContactInfo(`+${profile?.phone}`)
    // Reset the new message animation to false
    sendNewMessageAnimation.current = false;
  }*/

  const handleSend = async (message: string) => {
    if (!message.trim() && !imageUri) return
    if (!activeWallet) throw new Error("No active wallet");

    try {
      // await sendMessage(userId, text, '', ChatMessageType.text, imageUri || undefined)
      // await createMessage.mutateAsync({
      /*await sendMessage({
        recipientId: userId,
        newMessage: {
          thread_id: threadId,
          sender_id: user?.id!,
          content: text,
          image_url: imageUri ?? null,
          sender_wallet: activeWallet?.publicKey.toBase58(),
          message_type: ChatMessageType.text,
        }
      });*/

      // await handleCreateMessage({
      //   recipientId: recipientId,
      //   newMessage: {
      //     id: Crypto.randomUUID(),
      //     threadId: threadId,
      //     senderId: sender?.id!,
      //     content: message,
      //     imageUrl: imageUri ?? null,
      //     // sender_wallet: activeWallet?.publicKey.toBase58(),
      //     messageType: ChatMessageType.text,
      //   }
      // })

      await createMessage.mutateAsync({
        // id: Crypto.randomUUID()!,
        threadId: threadId!,
        senderId: sender?.id!,
        content: message,
        imageUrl: imageUri ?? null,
        // sender_wallet: activeWallet?.publicKey.toBase58(),
        messageType: ChatMessageType.text,
        syncStatus: SyncStatus.pending, // is pending if offline, else is syncing
        readStatus: ReadStatus.pending, // is pending if offline, else is sent
      })
      sendNewMessageAnimation.current = true;
      setText('')
      setImageUri(null)
      // load()

      // Reset the new message animation to false
      sendNewMessageAnimation.current = false;
    } catch (e) {
      Alert.alert("Error sending message", e.message)
      toast.error("You don't have an active wallet. Kindly check your wallet page")
    }
  }

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    })

    if (!result.canceled) {
      setImageUri(result.assets[0].uri)
    }
  }

  const handleAttachFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*", // Accept all file types
        multiple: true,
      });
      // if (onFileUpload && result.type === "success") {
      //   onFileUpload(result);
      // }
      if (result.output?.length > 0) {
        Alert.alert(`${result.output.length} file uploaded to: ${result.output[0]}`);
      }
      if (result.type === "success") {
        Alert.alert("File Selected", result.name || "Unnamed file");
      }
    } catch (err) {
      console.error("Error selecting file:", err);
    }
  };

  const handleVoiceRecordStart = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission Denied", "You need to allow microphone access.");
        return;
      }

      /*await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });*/

      const {recording} = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);

      // Start duration timer
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording", error);
    }
  }

  const handleVoiceRecordStop = async () => {
    if (!recording) return;

    if (recording) {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      Alert.alert("Recording Stopped", `Saved at ${uri}`);
      setRecording(null);
    }

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri && onAudioSend) {
        onAudioSend(uri);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }

    // setAudioRecording(null);
    setRecording(null);

    // Clear duration timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setRecordingDuration(0);
  }

  const handleCreatePaymentLink = (data: PaymentFormData) => {
    // Implement payment link creation logic
    console.log('Creating payment link:', data);
  };

  const handleMakePayment = async (data: PaymentFormData) => {
    // Implement payment logic
    try {
      // Store the txId to the database so that the user can confirm the payment / transaction anytime.

      // Payment Flow:
      // 1. Create the payment object and store to local
      // 2. Show the Payment state to the sender as pending
      // 3. Create the chat message and attach the payment id
      // 4. Initiate the payment transaction
      // 5. Update the payment object in local to reflect the transaction changes.
      const paymentResponse = await createPayment.mutateAsync({
        sender: sender?.id!,
        recipient: recipientId,
        amount: Number(data.amount),
        status: PaymentStatus.pending,
        transactionHash: ""
      });
      console.log("Making payment response", paymentResponse);

      await createMessage.mutateAsync({
        id: Crypto.randomUUID(),
        threadId: threadId,
        senderId: sender?.id!,
        content: data.label || data.message || "",
        imageUrl: imageUri ?? null,
        // sender_wallet: activeWallet?.publicKey.toBase58(),
        payments: paymentResponse?.[0]?.id,
        messageType: ChatMessageType.payment,
        syncStatus: SyncStatus.pending, // is pending if offline, else is syncing
        readStatus: ReadStatus.pending, // is pending if offline, else is sent
      });

      let tx;
      try {
        console.log("payment DATA:::", data, recipient);
        // tx = await sendSol(data.walletKeypair!, new PublicKey(recipient?.wallets?.wallet_number!), parseFloat(data.amount))
        tx = await sendSol(data.walletKeypair!, new PublicKey(recipientServerProfile?.wallets?.wallet_number!), parseFloat(data.amount))
        // Alert.alert('Success', `TX: ${tx}`)
        toast('Transfer complete', {description: `TX: ${tx}`})

        // Store the txId to the database so that the user can confirm the payment / transaction anytime.
        if (tx) {
          await updatePayment.mutateAsync({
            id: paymentResponse?.[0]?.id,
            // sender: sender?.id!,
            // recipient: recipientId,
            // amount: Number(data.amount),
            status: PaymentStatus.completed,
            transactionHash: tx
          });
        }
      } catch (e) {
        // Store the txId to the database so that the user can confirm the payment / transaction anytime.
        await updatePayment.mutateAsync({
          id: paymentResponse?.[0]?.id,
          // sender: sender?.id!,
          // recipient: recipientId,
          // amount: Number(data.amount),
          status: PaymentStatus.failed,
          transactionHash: ""
        });
      }

      // await sendMessage(userId, data.label || data.message, response.id, ChatMessageType.payment, imageUri || undefined)

      // await handleCreateMessage({
      //   recipientId: recipientId,

      console.log('Making payment:', data);
    } catch (e) {
      console.error("Error making payment", e);
    }
  };

  const handleChatActions = async (type: string, messageId: string) => {
    try {
      if (type === "delete") {
        await syncEngine.deleteLocalMessageAndSyncWithServer(messageId);
      }
    } catch(err) {
      console.error("Failed to delete chat", err);
    }
  }

  /*useEffect(() => {
    load()
  }, [])*/

  const ChatMessageItem = React.memo((
    {
      item,
      senderId
    }: {
      item: ChatMessagesWithDecryptedMessage,
      senderId: string
    }) => {

    return (
      <View
        className={""}
        // entering={sendNewMessageAnimation ? FadeIn.delay(150) : undefined}
        // entering={sendNewMessageAnimation ? SlideInDown.duration(3600).springify(400) : undefined}
        // entering={sendNewMessageAnimation ? SlideInDown.duration(300).springify().withDelay(150).withCallback(() => FadeIn.duration(200)) : undefined}
        // entering={sendNewMessageAnimation ? SlideInDown.duration(200).delay(0) : FadeIn.duration(0)}
      >
        <ChatBubble
          text={item.decryptedContent}
          deleted={item.deleted}
          mine={(item.senderId || item.sender_id) === senderId}
          imageUri={item.imageUrl || item.imageUri}
          encrypted={item.encrypted}
          timestamp={new Date(item.localCreatedAt!) || new Date(item.createdAt!) || new Date(item.created_at)}
          readStatus={item.readStatus! as ReadStatus}
          syncStatus={item.syncStatus! as SyncStatus}
          messageType={item.messageType || item.message_type}
          payment={(item.messageType || item.message_type) === ChatMessageType.payment ? {
            amount: item.payments?.amount,
            label: item.decryptedContent,
            status: item.payments?.status,
            transaction_hash: item.payments?.transactionHash,
          } : undefined}
          onPress={() => {
            console.log('Message pressed')
          }}
          onLongPress={() => {
            currentChatBubbleRef.current = item;
            // chatPressOptionsSheetRef.current?.present(item.id)
            setShowChatOptionsSheet(true)
            // handleChatActions(item.id)
          }}
          onMessageAction={(action, message) => {
            switch (action) {
              case 'copy':
                // Show toast notification
                break;
              case 'reply':
                // Handle reply
                break;
              case 'delete':
                // Handle delete
                break;
            }
          }}
          showMessageDetails={() => {
            // Show message details or image preview
          }}
        />
      </View>
    );
  });

  // Memoize the renderItem function
  const renderItem = useCallback(({item, index}: { item: any, index: number }) => (
    <ChatMessageItem item={item} senderId={sender?.id}/>
  ), [sender?.id]);

  // Memoize the keyExtractor
  const keyExtractor = useCallback((item: ChatMessagesWithDecryptedMessage) =>
    item.id, []);

  // Memoize the ListHeaderComponent
  const ListHeader = useCallback(() => (
    <View className={"relative flex flex-col justify-center items-start gap-2 py-8"}>
      <Avatar alt="Zach Nugent's Avatar" className={"w-28 h-28"}>
        <AvatarImage source={{uri: ""}}/>
        <AvatarFallback>
          <Text></Text>
        </AvatarFallback>
      </Avatar>
      {!contactInfo?.id ? (
        <React.Fragment>
          <Skeleton className='h-6 w-32 rounded-full'/>
          <Skeleton className='h-5 w-40 rounded-full'/>
          <Skeleton className='h-5 w-64 rounded-full'/>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <Text className={"font-bold text-xl"}>{contactInfo?.name}</Text>
          <Text className={"font-medium text-lg text-muted-foreground"}>
            {recipient?.wallets && shortenAddress(recipient?.wallets?.wallet_number!)}
          </Text>
          <Text style={{textAlign: "left"}}>
            {!recipient?.id ? <ActivityIndicator/> : recipient?.bio}
          </Text>
        </React.Fragment>
      )}
    </View>
  ), [contactInfo, recipient, profile, profileLoading]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatMessages?.length) {
      setTimeout(() => {
        // flatListRef.current?.scrollToEnd({ animated: true });
        flatListRef.current?.scrollToOffset({offset: 0, animated: true});
      }, 100);
    }
  }, [chatMessages]);

  // Performance optimizations for FlatList
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 100, // Approximate height of each item
    offset: 100 * index,
    index,
  }), []);

  const MemoizedChatInput = memo(() => (
    <ChatInput
      recipient={profile}
      onSendMessage={handleSend}
      onAttachFile={handleAttachFile}
      onVoiceRecordStart={handleVoiceRecordStart}
      onVoiceRecordStop={handleVoiceRecordStop}
      isRecording={isRecording}
      chatInput={AIDraftMessage?.toString() || text}
      setChatInput={setText}
      // chatInput={textInputRef.current}
      // setChatInput={(value) => {textInputRef.current = value}}
      imageUri={imageUri!}
      setImageUri={setImageUri!}
      onCreatePaymentLink={handleCreatePaymentLink}
      onMakePayment={handleMakePayment}
    />
  ));

  return (
    <>
      <PageContainer>
        <ImageBackground
          resizeMethod={"auto"}
          source={require('~/assets/images/scan-background.png')}
          style={{flex: 1}}
          imageStyle={{
            opacity: 0.075,  // Adjust opacity as needed
            resizeMode: "repeat"
          }}
        >
          <LinearGradient
            // rgba(240,122,2,0.1) - For whatsApp background color
            // colors={['rgba(40,122,206,0.0)', 'rgba(0,0,0,0.2)', 'rgba(43,246,100,0.1)']}
            colors={['rgba(43,246,100,0.1)', 'rgba(0,0,0,0.2)', 'rgba(40,122,206,0.0)']}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
            }}
          />

          <PageHeader showBackButton={true} className={"bg-white/80"}>
            <View>
              <Avatar alt="Zach Nugent's Avatar">
                <AvatarImage source={{uri: ""}}/>
                <AvatarFallback>
                  <Text></Text>
                </AvatarFallback>
              </Avatar>
            </View>
            <View className={"flex-1"}>
              <PageHeading className={"gap-x-2 text-xl"}>
                {
                  !contactInfo?.id
                    ? <Skeleton className='h-12 w-12 rounded-full'/>
                    : contactInfo?.name
                }
              </PageHeading>
              <Text className={"pr-2"} numberOfLines={1}>{recipient?.bio || contactInfo?.phone}</Text>
            </View>
          </PageHeader>

          <PageBody className={""}>
            {/*<FlatList
            inverted
            ref={flatListRef}
            data={chatMessages}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListHeaderComponent={ListHeader}
            className={"p-4"}
            contentContainerStyle={{
              flexGrow: 1,
              flexDirection: 'column-reverse',
              justifyContent: 'flex-end',
              backgroundColor: 'transparent',
              paddingVertical: 16
            }}
            getItemLayout={getItemLayout}
            removeClippedSubviews={false}
            // maxToRenderPerBatch={20}
            // windowSize={20}
            // initialNumToRender={20}
            // onScroll={event => {
            //   setContentVerticalOffset(event.nativeEvent.contentOffset.y);
            // }}
            // onContentSizeChange={() => {
            //   if (contentVerticalOffset === 0) {
            //     flatListRef.current?.scrollToEnd({ animated: false });
            //   }
            // }}
          />*/}

            <FlashList
              inverted
              ref={flatListRef}
              data={chatMessages}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              ListFooterComponent={ListHeader}
              className={""}
              contentContainerStyle={{
                backgroundColor: 'transparent',
              }}
              getItemLayout={getItemLayout}
              estimatedItemSize={55}
              getItemType={(item) => {
                return item.messageType;
              }}
              removeClippedSubviews={false}
              viewabilityConfig={{
                waitForInteraction: false,
                itemVisiblePercentThreshold: 50,
                minimumViewTime: 1000,
              }}
            />

            <MemoizedChatInput />

            {imageUri && (
              <View style={{alignItems: 'center', marginVertical: 8}}>
                <Image source={{uri: imageUri}} style={{width: 150, height: 150, borderRadius: 10}}/>
              </View>
            )}

            <View className={"hidden"}>
              {emojiOpen && (
                // <Picker onEmojiSelect={(e: any) => setText(text + e.native)} />
                <EmojiPicker onEmojiSelect={(e: { native: string }) => setText(text + e.native)}/>
              )}

              <View style={{padding: 10, flexDirection: 'row', alignItems: 'center'}}>
                <TouchableOpacity onPress={() => setEmojiOpen(!emojiOpen)}>
                  <Text style={{fontSize: 26, marginRight: 10}}>😊</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={pickImage}>
                  <Text style={{fontSize: 26, marginRight: 10}}>📎</Text>
                </TouchableOpacity>
                <TextInput
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: '#ccc',
                    borderRadius: 20,
                    padding: 10
                  }}
                  placeholder="Type a message"
                  value={text}
                  onChangeText={setText}
                />
                <Button title="Send" onPress={handleSend}/>
              </View>
            </View>

          </PageBody>

          <BottomSheetComponent
            // ref={chatPressOptionsSheetRef}
            snapPoints={[300]}
            open={showChatOptionsSheet}
            onOpenChange={() => setShowChatOptionsSheet(false)}
          >
            <BottomSheetContent>
              {/*<BottomSheetHeader>
                <BottomSheetTitle>
                  Actions
                </BottomSheetTitle>
              </BottomSheetHeader>*/}
              <View className="flex flex-col items-start gap-16 py-4">
                <View className={"flex flex-row justify-center items-center gap-x-2 w-full"}>
                  <Button className={"gap-y-2"} variant={"link"}>
                    <View className={"justify-center items-center w-14 h-14 bg-secondary rounded-full"}>
                      <LucidePin size={20} color={"black"} />
                    </View>
                    <Text>Pin</Text>
                  </Button>
                  <Button className={"gap-y-2"} variant={"link"} onPress={() => {
                    copyStringToClipboard(currentChatBubbleRef.current?.content!)
                    toast.info("Chat copied", { position: "bottom-center", richColors: true })
                  }}>
                    <View className={"justify-center items-center w-14 h-14 bg-secondary rounded-full"}>
                      <Ionicons name={'copy'} size={20} />
                    </View>
                    <Text>Copy</Text>
                  </Button>
                  <Button className={"gap-y-2"} variant={"link"}>
                    <View className={"justify-center items-center w-14 h-14 bg-secondary rounded-full"}>
                      <Ionicons name={'star'} size={20} />
                    </View>
                    <Text>Star</Text>
                  </Button>
                  <Button className={"gap-y-2"} variant={"link"}>
                    <View className={"justify-center items-center w-14 h-14 bg-secondary rounded-full"}>
                      <Ionicons name={'arrow-redo'} size={16} />
                    </View>
                    <Text className="text-left font-medium">
                      Reply
                    </Text>
                  </Button>
                </View>

                <View className={"gap-y-4 w-full"}>
                  <Separator className={""} />
                  <Button className={"flex-row items-center justify-start gap-x-3 w-full rounded-xl"} variant={"ghost"}>
                    <Ionicons name={'arrow-undo'} size={16} />
                    <Text className="text-left font-medium">
                      Forward
                    </Text>
                  </Button>

                  <Button
                    className={"flex-row items-center justify-start gap-x-3 w-full bg-destructive/10 rounded-xl"}
                    size={"default"}
                    variant={"ghost"}
                    onPress={() => syncEngine.deleteLocalMessageAndSyncWithServer(currentChatBubbleRef.current?.id!)}
                  >
                    <LucideTrash2 color={"red"} size={16} />
                    <Text className="text-left font-medium text-destructive">
                      Delete
                    </Text>
                  </Button>
                </View>
              </View>
            </BottomSheetContent>
          </BottomSheetComponent>
        </ImageBackground>
      </PageContainer>
    </>
  )
}
