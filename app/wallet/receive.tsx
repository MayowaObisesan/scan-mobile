import {PageBody, PageContainer, PageHeader, PageHeading} from "~/components/PageSection";
import {Alert, Share, TextInput, TouchableOpacity, View} from "react-native";
import {Text} from "~/components/ui/text";
import SolarUserBoldDuotoneIcon from "~/icon/UserBoldDuotoneIcon";
import {Ionicons} from "@expo/vector-icons";
import {Button} from "~/components/ui/button";
import React, {useState} from "react";
import {useExchangeRates} from "~/hooks/useExchangeRates";
import { PublicKey } from "@solana/web3.js";
import { sendSol } from "~/solana/wallet";
import {useWalletContext} from "~/contexts/WalletContext";
import {QrDisplay} from "~/components/QrDisplay";
import {copyStringToClipboard} from "~/utils";
import SolarCopyIcon from "~/icon/CopyIcon";
import SolarShareIcon from "~/icon/ShareIcon";
import {createSolanaPayLink} from "~/services/solanaPay";
import BigNumber from "bignumber.js";
import { toast } from "sonner-native";

export default function ReceiveScreen() {
  const {activePubkey, activeWallet, loadWallets, selectWallet, refreshBalance, walletsList} = useWalletContext();
  const {rates, isLoading: ratesLoading} = useExchangeRates();
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedCurrency, setSelectedCurrency] = useState<'usd' | 'eur' | 'ngn' | 'gbp'>('usd');

  const convertToFiat = (solBalance: number, currency?: string) => {
    const rate = rates[currency || selectedCurrency] || 0;
    return (solBalance * rate).toFixed(2);
  };

  const payLink = activeWallet
    ? createSolanaPayLink(activeWallet.publicKey, BigNumber(0.01), 'ChatFi User', 'Send me 0.01 SOL', 'payment memo')
    : ''

  const handleSend = async () => {
    try {
      const to = new PublicKey(recipient);
      const amountInLamports = parseFloat(amount);

      // Perform risk analysis
      /*await checkRiskBeforeSend({
        to: recipient,
        amount: amountInLamports,
      });*/

      // Proceed with sending SOL if no risk detected
      const tx = await sendSol(activeWallet!, to, amountInLamports);
      Alert.alert('Success', `TX: ${tx}`);
      loadWallets();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  };

  return (
    <PageContainer>
      <PageHeader showBackButton>
        <PageHeading>Receive</PageHeading>
      </PageHeader>

      <PageBody>
        <View className="px-4 py-6 bg-white rounded-2xl mb-8">
          <View className="items-center mb-6">
            <Text className="text-2xl font-bold mb-2">Receive SOL</Text>
            <Text className="text-muted-foreground text-center mb-4">
              Scan this QR code to receive SOL via Solana Pay
            </Text>

            <View className="bg-muted p-6 rounded-3xl mt-12 mb-16">
              {payLink && <QrDisplay value={payLink} label="Receive via Solana Pay"/>}
            </View>

            <View className="w-full bg-secondary/20 rounded-xl p-4 mb-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-medium text-muted-foreground">Your wallet address</Text>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onPress={() => {
                    copyStringToClipboard(activeWallet?.publicKey.toBase58()!).then(() => {
                      toast('Copied', {description: 'Wallet address copied to clipboard'});
                    });
                  }}
                >
                  {/*<Ionicons name="copy-outline" size={16} />*/}
                  <SolarCopyIcon color={"gray"} />
                </Button>
              </View>
              <Text className="font-mono text-base mt-1" numberOfLines={1}>
                {activeWallet?.publicKey.toBase58()}
              </Text>
            </View>

            <View className="flex-row gap-4 mt-2">
              <Button
                className="flex-1 flex-row items-center gap-x-1"
                onPress={() => {
                  copyStringToClipboard(payLink).then(() => {
                    toast('Copied', {description: 'Solana Pay link copied to clipboard'});
                  });
                }}
              >
                {/*<Text><Ionicons name="copy-outline" size={16} className="mr-2" /></Text>*/}
                <SolarCopyIcon color={"white"} />
                <Text>Copy Pay Link</Text>
              </Button>
              <Button
                className="flex-1 flex flex-row items-center gap-x-2"
                variant="secondary"
                onPress={async () => {
                  try {
                    const result = await Share.share({
                      message: payLink,
                      title: 'Share Solana Pay Link',
                    });

                    if (result.action === Share.sharedAction) {
                      if (result.activityType) {
                        console.log('Shared with activity type:', result.activityType);
                      } else {
                        console.log('Link shared successfully');
                      }
                    } else if (result.action === Share.dismissedAction) {
                      console.log('Share dismissed');
                    }
                  } catch (error) {
                    Alert.alert('Error', 'Failed to share the link');
                    console.error('Share error:', error);
                  }
                }}
              >
                <SolarShareIcon color={"#2563EBE6"} />
                <Text>Share</Text>
              </Button>
            </View>
          </View>
        </View>
      </PageBody>
    </PageContainer>
  )
}
