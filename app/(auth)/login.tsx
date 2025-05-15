import { View, Image, Alert, Pressable, FlatList } from 'react-native'
import {useRef, useState } from 'react'
import { TextInputField } from '~/components/TextInputField'
import { supabase } from '~/supabase/client'
import { router } from 'expo-router'
import {Button} from "~/components/ui/button";
import {Text} from "~/components/ui/text";
import Animated, { FadeIn, BounceIn, SlideInRight } from 'react-native-reanimated'
// import { PhoneInput, isValidNumber } from 'react-native-phone-entry';
import {PageBody, PageContainer} from "~/components/PageSection";
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import PhoneNumberInput from 'react-native-phone-number-input';


const slides = [
  {
    id: '1',
    title: 'Welcome to ChatFi',
    description: 'Simple. Secure. Reliable messaging.',
    image: require('../../assets/images/scan-icon.png'),
  },
  {
    id: '2',
    title: 'Stay Connected',
    description: 'Chat with your friends and family anytime, anywhere.',
    image: require('../../assets/images/scan-icon.png'),
  },
  {
    id: '3',
    title: 'Secure Messaging',
    description: 'Your privacy is our priority.',
    image: require('../../assets/images/scan-icon.png'),
  },
]

export function IntroScreen() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    } else {
      router.push('/(auth)/login')
    }
  }

  const handleSkip = () => {
    router.push('/(auth)/login')
  }

  return (
    <View className="flex-1 bg-secondary/30 justify-center items-center px-6">
      <FlatList
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width)
          setCurrentSlide(index)
        }}
        renderItem={({ item }) => (
          <Animated.View
            className="items-center"
            entering={SlideInRight.duration(500)}
          >
            <Image
              source={item.image}
              className="w-32 h-32 mb-6"
              resizeMode="contain"
            />
            <Text className="text-2xl font-bold text-primary mb-4 text-center">
              {item.title}
            </Text>
            <Text className="text-base text-gray-600 mb-8 text-center">
              {item.description}
            </Text>
          </Animated.View>
        )}
        keyExtractor={(item) => item.id}
      />
      <View className="flex-row justify-between items-center w-full px-4">
        <Pressable onPress={handleSkip}>
          <Text className="text-primary text-lg">Skip</Text>
        </Pressable>
        <View className="flex-row">
          {slides.map((_, index) => (
            <View
              key={index}
              className={`h-2 w-2 rounded-full mx-1 ${
                index === currentSlide ? 'bg-primary' : 'bg-gray-400'
              }`}
            />
          ))}
        </View>
        <Pressable onPress={handleNext}>
          <Text className="text-primary text-lg">
            {currentSlide === slides.length - 1 ? 'Start' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

export default function Login() {
  const [phone, setPhone] = useState('')
  const [formattedPhone, setFormattedPhone] = useState('');
  const [isValid, setIsValid] = useState(true);
  const phoneInput = useRef<PhoneNumberInput>(null);

  const validatePhoneNumber = (number: string, countryCode: string) => {
    try {
      const isValid = isValidPhoneNumber(number, countryCode);
      setIsValid(isValid);
      return isValid;
    } catch (error) {
      setIsValid(false);
      return false;
    }
  };

  const sendOtp = async () => {
    // Get the full number with country code
    const checkValid = phoneInput.current?.isValidNumber(phone);

    if (!checkValid) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number');
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.push({
        pathname: '/(auth)/otp',
        params: { phone: formattedPhone }
      });
    }
  };

  return (
    <PageContainer>
      <PageBody>
        <View className={"flex-1 gap-y-12"} style={{ paddingHorizontal: 20, paddingVertical: 40 }}>
          <View className="flex-1 bg-secondary/50 justify-center items-center px-6 rounded-2xl">
            <Animated.Image
              source={require('../../assets/images/scan-icon.png')} // Replace with your logo path
              className="w-32 h-32 mb-6 rounded-full"
              resizeMode="contain"
              entering={FadeIn.duration(1000)}
            />
            <Animated.Text
              className="text-2xl font-bold text-primary mb-4 text-center"
              entering={FadeIn.delay(500).duration(1000)}
            >
              Welcome to Scan
            </Animated.Text>
            <Text className="text-base text-gray-600 mb-8 text-center">
              Social and Payment made seamless
            </Text>
            {/*<Animated.View entering={BounceIn.delay(1000)}>
              <Pressable
                onPress={() => router.push('/(auth)/login')}
                className="bg-primary py-3 px-6 rounded-xl shadow-md active:opacity-80"
              >
                <Text className="text-white text-lg font-semibold">Get Started</Text>
              </Pressable>
            </Animated.View>*/}
          </View>

          <View className="gap-y-8">
            <PhoneNumberInput
              ref={phoneInput}
              defaultValue={phone}
              defaultCode="US"
              layout="first"
              onChangeText={(text) => {
                setPhone(text);
              }}
              onChangeFormattedText={(text) => {
                setFormattedPhone(text);
                validatePhoneNumber(text, phoneInput.current?.getCountryCode() || 'US');
              }}
              withDarkTheme={false}
              withShadow={false}
              autoFocus={true}
              containerStyle={{
                width: '100%',
                maxHeight: '90%',
                borderRadius: 12,
                backgroundColor: '#f3f4f6',
              }}
              textContainerStyle={{
                borderRadius: 8,
                backgroundColor: '#f3f4f6',
              }}
            />

            {!isValid && phone.length > 0 && (
              <Text className="text-red-500 text-sm">
                Please enter a valid phone number
              </Text>
            )}

            <Button
              className="bg-primary rounded-2xl !h-16"
              disabled={!isValid || phone.length === 0}
              size={"lg"}
              onPress={sendOtp}
            >
              <Text className="text-white">Send OTP</Text>
            </Button>
          </View>

          {/*<TextInputField label="Phone Number" value={phone} onChangeText={setPhone} />
          <Button className={"bg-emerald-500"} title="Send OTP" onPress={sendOtp}>
            <Text>Send OTP</Text>
          </Button>*/}
        </View>
      </PageBody>
    </PageContainer>
  )
}
