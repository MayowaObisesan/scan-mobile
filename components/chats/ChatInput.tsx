import React, {memo, useRef, useState} from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import {Ionicons, MaterialIcons} from "@expo/vector-icons";
import {EmojiKeyboard} from "rn-emoji-keyboard";
import {ThemedView} from "~/components/ThemedView";
import {PaymentOptionsSheet} from "~/components/chats/payments/PaymentOptionsSheet";
import {PaymentFormData, PaymentFormSheet} from "~/components/chats/payments/PaymentFormSheet";
import {Text} from "~/components/ui/text";
import GifSearch from 'react-native-gif-search';
// import {BottomSheetModal} from "@gorhom/bottom-sheet";
import SolarWalletIcon from "~/icon/WalletIcon";
import SolarSendDuotoneIcon from "~/icon/SendDuotoneIcon";
import SolarMicrophone3BoldDuotoneIcon from "~/icon/Microphone3BoldDuotoneIcon";
import SolarStopCircleBoldDuotoneIcon from "~/icon/StopCircleBoldDuotoneIcon";
import SolarSmileSquareBoldDuotoneIcon from "~/icon/SmileSquareBoldDuotoneIcon";
import SolarSmileCircleLineDuotoneIcon from "~/icon/SmileCircleLineDuotoneIcon";
import SolarKeyboardLineDuotoneIcon from "~/icon/KeyboardLineDuotoneIcon";
import SolarPaperclipBoldDuotoneIcon from "~/icon/PaperclipBoldDuotoneIcon";
// import {GiphyDialog} from "@giphy/react-native-sdk";
// import {GiphyContent, GiphyGridView, GiphySDK} from '@giphy/react-native-sdk'

// GiphySDK.configure({apiKey: 'yOPeYBhE0UgZeACazn7blWTmJ3YGGzJs'});

interface ChatInputProps {
  recipient: any;
  onSendMessage: (message: string) => void;
  // onSendMessage: () => void;
  onAttachFile?: () => void;
  onVoiceRecordStart?: () => void;
  onVoiceRecordStop?: () => void;
  isRecording?: boolean;
  chatInput: string;
  setChatInput: React.Dispatch<React.SetStateAction<string>>;
  imageUri: string;
  setImageUri: React.Dispatch<React.SetStateAction<string>>;
  onCreatePaymentLink?: (data: PaymentFormData) => void;
  onMakePayment?: (data: PaymentFormData) => void;
}

const ChatInput: React.FC<ChatInputProps> = (
  {
    recipient,
    onSendMessage,
    onAttachFile,
    onVoiceRecordStart,
    onVoiceRecordStop,
    isRecording,
    chatInput,
    setChatInput,
    imageUri,
    setImageUri,
    onCreatePaymentLink,
    onMakePayment
  }) => {
  const colorScheme = useColorScheme();
  const [message, setMessage] = useState<string>(chatInput || "");
  // const [isRecording, setIsRecording] = useState<boolean>(false);
  // const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [showGifPicker, setShowGifPicker] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  // const [audioRecording, setAudioRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const recordingTimerRef = useRef<NodeJS.Timeout>();
  const {height: windowHeight} = useWindowDimensions();
  const emojiPickerHeight = windowHeight * 0.4; // 40% of screen height
  // Add new state in the component
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentFormType, setPaymentFormType] = useState<'link' | 'payment'>('link');
  const paymentFormSheetRef = useRef(null);

  const handleSend = () => {
    if (message.trim()) {
      // Alert.alert("Message Sent", message.trim());
      onSendMessage(message);
      setMessage("");
      // onSendMessage()
      setIsTyping(false);
      // if (setChatInput) setChatInput('')
    }
  };

  const startRecording = async () => {
    onVoiceRecordStart?.();
  };

  const stopRecording = async () => {
    onVoiceRecordStop?.()
  };

  const handleVoicePress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleAttachFile = async () => {
    /*try {
        const result = await DocumentPicker.pick({
            type: [DocumentPicker.types.allFiles],
        });
        Alert.alert("File Selected", result[0]?.name || "No file name");
    } catch (err) {
        if (DocumentPicker.isCancel(err)) {
            console.log("File selection canceled");
        } else {
            console.error("Error selecting file:", err);
        }
    }*/

    onAttachFile?.();
  };

  // GIF picker
  const handleGifSelect = (gif: any) => {
    if (onGifSelect && gif.url) {
      onGifSelect(gif.url);
    }
    setShowGifPicker(false);
  };

  // const toggleEmojiPicker = () => setShowEmojiPicker((prev) => !prev);

  const toggleEmojiPicker = () => {
    Keyboard.dismiss(); // Dismiss keyboard if open
    setShowEmojiPicker((prev) => !prev);
    setShowGifPicker(false);
  };

  // Add new handlers
  const handleCreateLink = () => {
    setPaymentFormType('link');
    setShowPaymentOptions(false);
    setShowPaymentForm(true);
  };

  const handleMakePayment = () => {
    setPaymentFormType('payment');
    setShowPaymentOptions(false);
    setShowPaymentForm(true);
  };

  const handlePaymentSubmit = (data: PaymentFormData) => {
    if (paymentFormType === 'link' && onCreatePaymentLink) {
      onCreatePaymentLink(data);
    } else if (paymentFormType === 'payment' && onMakePayment) {
      onMakePayment(data);
    }
    setShowPaymentForm(false);
  };

  const MemoizedPaymentFormSheet = memo(() => (
      <PaymentFormSheet
          isOpen={showPaymentForm}
          onClose={() => setShowPaymentForm(false)}
          onSubmit={handlePaymentSubmit}
          type={paymentFormType}
          recipient={recipient}
      />
  ));

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        className="w-full"
      >
        <ThemedView className="w-full">
          {isTyping && (
            <ThemedView className="px-4 py-1">
              <Text className="text-xs text-muted-foreground">Typing...</Text>
            </ThemedView>
          )}

          {/* Input Bar */}
          <ThemedView className="flex-row items-end p-2 border-t border-muted">
            <View className={"flex flex-row items-center p-1.5 rounded-full"}>
              <TouchableOpacity onPress={toggleEmojiPicker} className="flex flex-row justify-center items-center w-12 h-12 rounded-full">
                {/*<Ionicons
                  name={showEmojiPicker ? "keypad-outline" : "happy-outline"}
                  size={24}
                  color="#888"
                />*/}
                {showEmojiPicker
                  ? <SolarKeyboardLineDuotoneIcon color={"#888"} height={28} width={28} />
                  : <SolarSmileCircleLineDuotoneIcon color={"#888"} height={28} width={28}/>
                }
              </TouchableOpacity>

              {/*<TouchableOpacity
                onPress={() => setShowGifPicker(true)}
                className="px-2"
              >
                <Ionicons name="gift-outline" size={24} color="#888"/>
              </TouchableOpacity>*/}

              {!message.trim() && <TouchableOpacity onPress={handleAttachFile} className="flex flex-row justify-center items-center w-12 h-12 rounded-full">
                {/*<Ionicons name="attach" size={24} color="#888"/>*/}
                <SolarPaperclipBoldDuotoneIcon height={24} color="#888"/>
              </TouchableOpacity>}
            </View>

            <TextInput
              className="self-center flex-1 max-h-24 mx-2 py-2 text-base"
              placeholder="Write a message..."
              placeholderTextColor={colorScheme === 'dark' ? '#999' : '#999'}
              value={message}
              onChangeText={(text) => {
                setMessage(text);
                // if (setChatInput) setChatInput(text); // Sync with parent state if provided
              }}
              onFocus={() => {
                setShowEmojiPicker(false);
                setShowGifPicker(false);
              }}
              multiline
            />

            {isRecording && (
              <ThemedView className="absolute right-14 px-2 py-1 rounded-full bg-red-500">
                <Text className="text-white text-xs">
                  {Math.floor(recordingDuration / 60)}:
                  {(recordingDuration % 60).toString().padStart(2, '0')}
                </Text>
              </ThemedView>
            )}

            <ThemedView className={"flex flex-row items-center gap-x-3 p-1.5 rounded-full"}>
              <TouchableOpacity
                onPress={message.trim() ? handleSend : isRecording ? stopRecording : startRecording}
                className="flex flex-row justify-center items-center w-12 h-12 rounded-full bg-secondary"
              >
                {message.trim() ? (
                  // <Ionicons name="send" size={20} color="#007AFF"/>
                  <SolarSendDuotoneIcon color="#007AFF"/>
                ) : (
                  <Text>
                    {/*<MaterialIcons
                      name={isRecording ? "stop-circle" : "mic"}
                      size={24}
                      color={isRecording ? "#FF0000" : "#007AFF"}
                    />*/}
                    {
                      isRecording
                      ? <SolarStopCircleBoldDuotoneIcon color="#FF0000" />
                      : <SolarMicrophone3BoldDuotoneIcon color="#007AFF"/>
                    }
                  </Text>
                )}
              </TouchableOpacity>

              {/*// Add wallet button to the input bar (inside the existing ThemedView)*/}
              {!message.trim() && <TouchableOpacity
                onPress={() => setShowPaymentOptions(true)}
                // className="px-2"
                className="flex flex-row justify-center items-center w-14 h-14 rounded-full bg-secondary dark:bg-secondary"
              >
                {/*<Ionicons name="wallet-outline" size={20} color="#fff"/>*/}
                <SolarWalletIcon color="black" height={32} width={32}/>
              </TouchableOpacity>}
            </ThemedView>
          </ThemedView>

          {imageUri && (
            <ThemedView className="p-2">
              <Image
                source={{uri: imageUri}}
                style={{width: 100, height: 100, borderRadius: 8}}
              />
              <TouchableOpacity onPress={() => setImageUri(null)}>
                <Text>Remove</Text>
              </TouchableOpacity>
            </ThemedView>
          )}

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <ThemedView
              className="w-full border-t border-muted"
              style={{height: emojiPickerHeight}}
            >
              {/*<EmojiPicker
                        onEmojiSelected={(emoji) => setChatInput(prev => prev + emoji.emoji)}
                        open={showEmojiPicker}
                        onClose={toggleEmojiPicker}
                        allowMultipleSelections
                        expandable={false}
                        // expandedHeight={emojiPickerHeight}
                        categoryPosition={"bottom"}
                      />*/}
                <EmojiKeyboard
                  onEmojiSelected={(emoji) => setMessage(prev => prev + emoji.emoji)}
                  categoryPosition="bottom"
                  // height={emojiPickerHeight}
                  allowMultipleSelections
                  // staticPosition={true}
                  expandable={true}
                  emojiSize={24}
                  enableRecentlyUsed={true}
                  enableSearchAnimation={false}
                  // enableSearchBar
                  hideSearchBarClearIcon={false}
                  hideHeader={true}
                  expandedHeight={300}
                />
            </ThemedView>
          )}

          {/* GIF Picker */}
          {/*// <GiphyDialog
          //   onGifSelect={handleGifSelect}
          //   onDismiss={() => setShowGifPicker(false)}
          // />*/}
         {/* {showGifPicker && (
            <GiphyGridView
              content={GiphyContent.trendingGifs()}
              cellPadding={3}
              style={{height: 400}}
              onMediaSelect={(e) => {
                console.log(e.nativeEvent.media)
              }}
            />
          )}*/}
          {/*{showGifPicker && (
            <ThemedView style={{ height: 300 }}>
              <GifSearch
                giphyApiKey="yOPeYBhE0UgZeACazn7blWTmJ3YGGzJs"
                onGifSelected={handleGifSelect}
                style={{ height: '100%' }}
                textInputProps={{ placeholder: 'Search GIFs...' }}
                loadingSpinnerColor="#000"
                placeholderTextColor="#666"
                darkGiphyLogo={colorScheme === 'dark'}
              />
            </ThemedView>
          )}*/}
        </ThemedView>

      </KeyboardAvoidingView>

      {/*// Add sheets at the bottom of the component (before the final closing tags)*/}
      <PaymentOptionsSheet
        isOpen={showPaymentOptions}
        onClose={() => setShowPaymentOptions(false)}
        onCreateLink={handleCreateLink}
        onMakePayment={handleMakePayment}
      />

      <MemoizedPaymentFormSheet />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    // borderTopWidth: 1,
    // borderColor: "#ddd",
    // backgroundColor: "#fff",
  },
  iconButton: {
    paddingHorizontal: 8,
  },
  input: {
    flex: 1,
    height: 48,
    marginHorizontal: 8,
    paddingVertical: 8,
    paddingHorizontal: 0,
    // backgroundColor: "#f2f2f2",
    borderRadius: 20,
    fontSize: 16,
  },
});

export default ChatInput;
