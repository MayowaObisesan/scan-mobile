import React, {useCallback, useRef, useState} from 'react'
import {Alert, Image, Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, View} from 'react-native'
import Animated from 'react-native-reanimated'
import {ChatMessageType, PaymentStatus, ReadStatus} from '~/types/enums'
import {format} from 'date-fns'
import {Text} from "~/components/ui/text"
import {Button} from "~/components/ui/button";
import {
  LucideArrowUpRight,
  LucideCheck,
  LucideCheckCheck, LucideCircleX,
  LucideClockFading,
  LucideHourglass
} from "lucide-react-native";
import {Ionicons} from "@expo/vector-icons";
import {formatDate} from "~/utils";
import { Separator } from './ui/separator'
import ContextMenu from "react-native-context-menu-view";
import {HoldItem} from "react-native-hold-menu";
import {BottomSheetComponent, BottomSheetContent, BottomSheetHeader, BottomSheetTitle} from "~/components/ui/bottom-sheet-component";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "~/components/ui/accordion";
// import { BottomSheetModal } from '@gorhom/bottom-sheet'
import {cn} from "~/lib/utils";
import {Swipeable} from "react-native-gesture-handler";
import {Link} from "expo-router";
import {solana_explorer_url, SOLANA_EXPLORER_URL} from "~/lib/constants";

export interface ChatBubbleProps {
  text: string
  deleted: boolean
  mine: boolean
  imageUri?: string
  encrypted?: boolean
  timestamp?: Date
  readStatus?: ReadStatus
  messageType?: ChatMessageType
  payment?: {
    amount: number
    label?: string
    status: 'completed' | 'pending' | 'failed',
    transaction_hash: string,
  }
  onPress?: () => void
  onLongPress?: () => void
  onMessageAction?: (action: 'copy' | 'delete' | 'reply', message: string) => void
  showMessageDetails?: () => void
}

export const ChatBubble = React.memo(function ChatBubble({
  text,
  deleted,
  mine,
  imageUri,
  encrypted,
  timestamp,
  readStatus = ReadStatus.sent,
  messageType = ChatMessageType.text,
  payment,
  onPress,
  onLongPress,
  onMessageAction,
  showMessageDetails,
}: ChatBubbleProps) {
  const AnimatedPressable = Animated.createAnimatedComponent(Pressable)
  const isFirstRender = useRef(true)
  const isNewMessage = useRef(true)
  const chatPressOptionsSheetRef = useRef(null)
  const [showChatOptionsSheet, setShowChatOptionsSheet] = useState<boolean>(false);

  const MenuItems = [
    { text: 'Actions', icon: 'home', isTitle: true, onPress: () => {} },
    { text: 'Action 1', icon: 'edit', onPress: () => {} },
    { text: 'Action 2', icon: 'map-pin', withSeparator: true, onPress: () => {} },
    { text: 'Action 3', icon: 'trash', isDestructive: true, onPress: () => {} },
  ];

  const menuItems = [
    { title: 'Copy', systemIcon: 'doc.on.doc' },  // iOS system icon
    { title: 'Reply', systemIcon: 'arrowshape.turn.up.left' },
    ...(mine ? [{
      title: 'Delete',
      systemIcon: 'trash',
      destructive: true
    }] : [])
  ];

  const messageTypeIcon = useCallback(() => {
    switch (messageType) {
      case ChatMessageType.text:
        return <Ionicons name="chatbubble-ellipses-outline" size={16} color="black" />
      case ChatMessageType.image:
        return <Ionicons name="image-outline" size={16} color="black" />
      case ChatMessageType.payment:
        return <LucideArrowUpRight size={16} color="black" />
      default:
        return null
    }
  }, [messageType])

  const handleMenuPress = ({ nativeEvent: { index } }) => {
    switch (menuItems[index].title) {
      case 'Copy':
        Clipboard.setString(text);
        onMessageAction?.('copy', text);
        break;
      case 'Reply':
        onMessageAction?.('reply', text);
        break;
      case 'Delete':
        onMessageAction?.('delete', text);
        break;
    }
  };

  const handlePress = () => {
    if (messageType === ChatMessageType.payment) {
      // Handle payment message press - maybe show transaction details
      showMessageDetails?.()
    } else if (imageUri) {
      // Handle image preview
      showMessageDetails?.()
    }
  }

  const handleLongPress = () => {
    // setShowChatOptionsSheet(true)
    chatPressOptionsSheetRef.current?.present()

    Alert.alert(
      'Message Options',
      'Choose an action',
      [
        {
          text: 'Copy',
          onPress: () => {
            Clipboard.setString(text)
            onMessageAction?.('copy', text)
          },
        },
        {
          text: 'Reply',
          onPress: () => onMessageAction?.('reply', text),
        },
        ...(mine ? [{
          text: 'Delete',
          style: 'destructive',
          onPress: () => onMessageAction?.('delete', text),
        }] : []),
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    )
  }

  const renderPaymentContent = () => (
    <View className="flex flex-row items-center gap-x-4 px-4 py-4 rounded-xl bg-muted">
      <View>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium">Payment of</Text>
        </View>

        <Text className="text-4xl font-black">
          {payment?.amount}
        </Text>
        <Text className="text-2xl font-bold">
          SOL
        </Text>

        {payment?.label && (
            <Text className="text-sm text-muted-foreground">
              {payment.label}
            </Text>
        )}
      </View>

      <Separator decorative={true} orientation={"vertical"} className='bg-border' />

      <View className={"gap-y-2"}>
        <Text className="font-semibold text-base text-muted-foreground">
          {timestamp && format(timestamp, 'MMM d, yyyy HH:mm')}
        </Text>
        <Text className={`font-bold text-small ${payment?.status === 'completed' ? 'text-green-500' : 'text-yellow-500'}`}>
          {payment?.status === PaymentStatus.pending
              && <View className={"flex flex-row items-center gap-x-1"}>
                <Text className={"font-semibold text-xl leading-tight"}>⏳Pending</Text>
              </View>
          }
          {payment?.status === PaymentStatus.completed
            && <View className={"flex flex-row items-center gap-x-1"}>
              <LucideCheck size={16} strokeWidth={4} color={"green"} />
              <Text className={"font-semibold text-xl leading-tight"}>Completed</Text>
          </View>
          }
          {payment?.status === PaymentStatus.failed
            && <View className={"flex flex-row items-center gap-x-1"}>
                <Text className={""}><LucideCircleX size={16} strokeWidth={3} color={"red"} /></Text>
              <Text className={"font-semibold text-xl leading-tight"}>Failed</Text>
          </View>
          }
        </Text>

        <View className="border border-dashed border-border my-2"/>

        <Button
          className={"text-xs h-8"}
          size={"sm"}
          variant={"default"}
        >
          <Link
            href={{
              pathname: "/browser/dapp-browser",
              params: {internallyPassedUrl: solana_explorer_url(payment?.transaction_hash!)}
            }}
          >
            <Text className={"text-xs font-normal"}>View receipt</Text>
          </Link>
        </Button>
      </View>
    </View>
  )

  const renderContent = useCallback(() => (
    <>
      {messageType === ChatMessageType.payment ? (
        renderPaymentContent()
      ) : (
        <>
            {imageUri && (
              <Image
                source={{uri: imageUri}}
                style={styles.image}
                resizeMode="cover"
              />
            )}

            <View className={"self-end flex flex-row items-end gap-x-1"} style={styles.foote}>
              {timestamp && (
                <Text className={cn("text-xs", mine ? "text-muted" : "text-muted-foreground")}>
                  {/*{timestamp && format(timestamp, 'HH:mm')}*/}
                  {timestamp && timestamp.toLocaleTimeString()}
                  {/*{timestamp && format(timestamp.getTime(), 'HH:mm')}*/}
                </Text>
              )}

              {mine && (
                <Text className={"text-muted flex flex-row align-middle"}>
                  {/*{readStatus === ReadStatus.pending && <Ionicons name={"hourglass-outline"} size={12} />}*/}
                  {readStatus === ReadStatus.pending && <LucideClockFading color={"white"} size={12} strokeWidth={3} />}
                  {readStatus === ReadStatus.sent && <LucideCheck color={"white"} size={12} strokeWidth={3} />}
                  {readStatus === ReadStatus.delivered && <LucideCheckCheck color={"white"} size={12} strokeWidth={3} />}
                  {readStatus === ReadStatus.read && '✓✓'}
                </Text>
              )}
            </View>

            <View className={"flex flex-row items-center justify-start gap-x-2"}>
              {/*<View className={"flex flex-row shrink"}>*/}
                <Text className={cn("flex flex-wrap text-ellipsis", deleted ? "text-muted-foreground" : "")} style={[
                  styles.messageText,
                  mine ? styles.myMessageText : styles.theirMessageText,
                ]}>
                  {deleted && (
                    <Text className={""} style={styles.encryptedText}>🗑️</Text>
                  )}
                  {deleted ? "message deleted" : text}
                </Text>
              {/*</View>*/}

              {/*{encrypted && (
                <Text className={"absolute top-2 right-2"} style={styles.encryptedText}>🔐</Text>
              )}*/}

              {/*<View className={"self-end flex flex-row items-end gap-x-1"} style={styles.foote}>
                {timestamp && (
                  <Text className={cn("text-xs", mine ? "text-muted" : "text-muted-foreground")}>
                    {timestamp && format(timestamp, 'HH:mm')}
                    {timestamp && timestamp.toLocaleTimeString()}
                    {timestamp && format(timestamp.getTime(), 'HH:mm')}
                  </Text>
                )}

                {mine && (
                  <Text className={"text-muted flex flex-row align-middle"}>
                    {readStatus === ReadStatus.pending && <Ionicons name={"hourglass-outline"} size={12} />}
                    {readStatus === ReadStatus.pending && <LucideClockFading color={"white"} size={12} strokeWidth={3} />}
                    {readStatus === ReadStatus.sent && <LucideCheck color={"white"} size={12} strokeWidth={3} />}
                    {readStatus === ReadStatus.delivered && <LucideCheckCheck color={"white"} size={12} strokeWidth={3} />}
                    {readStatus === ReadStatus.read && '✓✓'}
                  </Text>
                )}
              </View>*/}
            </View>
        </>
      )}
    </>
  ), [text, mine, imageUri, encrypted, timestamp, readStatus, messageType, payment])

  const renderRightActions = (progress, dragX) => {
    return (
      <View className={"flex-row items-center justify-start bg-white/80 p-2"}>
        <Button
          className={"justify-center items-center w-12 h-12 mx-1 rounded-2xl"}
          variant="ghost"
          // onPress={() => onMessageAction?.('reply', text)}
        >
          <Ionicons name="arrow-undo" size={20} color="#666" />
        </Button>
        {mine && (
          <Button
            className={"justify-center items-center w-12 h-12 mx-1 rounded-2xl"}
            variant="ghost"
            // onPress={() => onMessageAction?.('delete', text)}
          >
            <Ionicons name="trash" size={20} color="#ff4444" />
          </Button>
        )}
      </View>
    );
  };

  return (
    <>
      {/*<Swipeable
        renderLeftActions={renderRightActions}
        leftThreshold={40}
        friction={2}
      >*/}
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          // entering={isFirstRender.current ? SlideInDown.duration(300).springify() : undefined}
          // layout={Layout.springify()}
          style={[
            styles.container,
            mine ? styles.myMessage : styles.theirMessage,
            messageType === ChatMessageType.payment && styles.paymentMessage
          ]}
        >
          {renderContent()}
          {/*<Animated.View
            entering={isFirstRender.current ? FadeIn.delay(150) : undefined}
          >
          </Animated.View>*/}
        </Pressable>
      {/*</Swipeable>*/}
    </>
  )
})

const styles = StyleSheet.create({
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
  },
  swipeButton: {
    height: 50,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  deleteButton: {
    backgroundColor: 'rgba(255,0,0,0.1)',
  },
  paymentMessage: {
    maxWidth: '90%',
    backgroundColor: 'transparent'
  },
  container: {
    position: "relative",
    margin: 5,
    padding: 10,
    borderRadius: 16,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    // elevation: 2
  },
  myMessage: {
    alignSelf: 'flex-end',
    // backgroundColor: '#007AFF',
    // backgroundColor: '#A1CBFCFF',
    backgroundColor: '#2563EBE6',
    borderBottomRightRadius: 4
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8E8E8',
    borderBottomLeftRadius: 4
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20
  },
  myMessageText: {
    color: '#FFFFFF'
  },
  theirMessageText: {
    color: '#000000'
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 8
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 4,
    textAlign: 'right'
  },
  encryptedText: {
    fontSize: 12
  },
  timestamp: {
    fontSize: 11,
    color: '#8E8E93',
    marginLeft: 4
  },
  status: {
    fontSize: 12,
    color: '#8E8E93'
  }
})
