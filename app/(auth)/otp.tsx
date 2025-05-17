import 'react-native-get-random-values'
import {Alert, TouchableOpacity, View} from 'react-native'
import {useState} from 'react'
import {supabase} from '~/supabase/client'
import {router, useLocalSearchParams} from 'expo-router'
import {generateWallet, setActiveWallet} from '~/solana/wallet'
import {Text} from '~/components/ui/text';
import {DBTables} from "~/types/enums";
import {MaterialIcons} from "@expo/vector-icons";
import {OtpInput} from "react-native-otp-entry";
import {PageBody, PageContainer, PageHeader, PageHeading} from "~/components/PageSection";

export default function OTP() {
  const {phone} = useLocalSearchParams<{ phone: string }>()
  const [otp, setOtp] = useState('')

  const verify = async () => {
    const {data: session, error} = await supabase.auth.verifyOtp({phone, token: otp, type: 'sms'})
    if (error) {
      Alert.alert('Verification Failed', error.message)
      return
    }

    // ✅ Generate Wallet
    let createdWallet;
    try {
      createdWallet = await generateWallet()
    } catch (e) {
      console.error("Error generating wallet", (e as any).message);
    }

    // ✅ Get user ID
    const userId = session?.user?.id
    const userPhone = session?.user?.phone

    if (!userId || !userPhone) {
      Alert.alert('Missing user info from Supabase session')
      return
    }

    // ✅ Check if profile exists
    const {data: existing} = await supabase.from('profiles').select('id').eq('id', userId).single()

    if (!existing) {
      const username = `user_${userPhone.slice(-4)}`
      // Create Wallet address to the wallet table first
      const {data} = await supabase.from(DBTables.Wallets)
        .insert({
          owner: userId,
          wallet_number: createdWallet?.publicKey.toBase58(),
          is_active: true,
        })
        .select()
        .single();

      if (data) {
        const {error: insertError} = await supabase.from(DBTables.Profiles).insert({
          id: userId,
          phone: userPhone,
          username,
          avatar_url: '',
          wallets: data.id,
        });
        if (insertError) {
          Alert.alert('Profile Creation Failed', insertError.message)
          return
        }
      }
    } else if (existing) {
      // Check if the user has a wallet, if not create a new wallet and add it to the profile.

      const username = `user_${userPhone.slice(-4)}`
      const {error: updateError} = await supabase.from('profiles')
        .update({
          phone: userPhone,
          username,
          avatar_url: '',
        })
        .eq('id', userId);
      if (updateError) {
        Alert.alert('Profile Update Failed', updateError.message)
        return
      }
    }

    setActiveWallet(createdWallet?.publicKey.toBase58()!)
    router.replace('/(tabs)/home')
  }

  return (
    <PageContainer>
      <PageHeader showBackButton className={"bg-transparent"}></PageHeader>
      <PageBody>
        <View className="flex-1 bg-white px-6 pt-12">
          <View className="items-center mb-8">
            <View className="w-20 h-20 bg-blue-50 rounded-full items-center justify-center mb-4">
              <MaterialIcons name="lock-outline" size={32} color="#3b82f6"/>
            </View>
            <Text className="text-2xl font-bold mb-2">Verification Code</Text>
            <Text className="text-gray-500 text-center">
              Enter the OTP code sent to{'\n'}
              <Text className="font-medium text-gray-700">{phone}</Text>
            </Text>
          </View>

          <View className="gap-y-12">
            {/*<TextInputField
            label="OTP Code"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            className="text-center text-xl tracking-widest"
            autoFocus
          />*/}

            <OtpInput
              numberOfDigits={6}
              focusColor="#2563EBE6"
              autoFocus={true}
              hideStick={false}
              // placeholder="******"
              blurOnFilled={true}
              disabled={false}
              type="numeric"
              secureTextEntry={false}
              focusStickBlinkingDuration={500}
              onFocus={() => console.log("Focused")}
              onBlur={() => console.log("Blurred")}
              onTextChange={(text) => setOtp(text)}
              onFilled={(text) => console.log(`OTP is ${text}`)}
              textInputProps={{
                accessibilityLabel: "One-Time Password",
              }}
              textProps={{
                accessibilityRole: "text",
                accessibilityLabel: "OTP digit",
                allowFontScaling: false,
              }}
              /*theme={{
                containerStyle: styles.container,
                pinCodeContainerStyle: styles.pinCodeContainer,
                pinCodeTextStyle: styles.pinCodeText,
                focusStickStyle: styles.focusStick,
                focusedPinCodeContainerStyle: styles.activePinCodeContainer,
                placeholderTextStyle: styles.placeholderText,
                filledPinCodeContainerStyle: styles.filledPinCodeContainer,
                disabledPinCodeContainerStyle: styles.disabledPinCodeContainer,
              }}*/
            />

            <View className={"gap-y-4"}>
              <TouchableOpacity
                onPress={verify}
                className="bg-blue-600 py-4 rounded-xl items-center"
                style={{
                  shadowColor: '#3b82f6',
                  shadowOffset: {width: 0, height: 4},
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Text className="text-white font-semibold text-lg">Verify Code</Text>
              </TouchableOpacity>

              <TouchableOpacity className="items-center py-4">
                <Text className="text-blue-600 font-medium">Resend Code</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </PageBody>
    </PageContainer>
  )
}
