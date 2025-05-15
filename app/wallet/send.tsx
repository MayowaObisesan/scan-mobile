import {PageBody, PageContainer, PageHeader, PageHeading} from "~/components/PageSection";
import {Alert, TextInput, TouchableOpacity, View} from "react-native";
import {Text} from "~/components/ui/text";
import SolarUserBoldDuotoneIcon from "~/icon/UserBoldDuotoneIcon";
import {Ionicons} from "@expo/vector-icons";
import {Button} from "~/components/ui/button";
import React, {useMemo, useRef, useState} from "react";
import {useExchangeRates} from "~/hooks/useExchangeRates";
import {PublicKey} from "@solana/web3.js";
import {sendSol} from "~/solana/wallet";
import {useWalletContext} from "~/contexts/WalletContext";
import { BottomSheet } from "~/components/ui/bottom-sheet";
import {BottomSheetModal} from "@gorhom/bottom-sheet";

export default function SendScreen() {
  const {activePubkey, activeWallet, loadWallets, selectWallet, refreshBalance, walletsList} = useWalletContext();
  const {rates, isLoading: ratesLoading} = useExchangeRates();
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedCurrency, setSelectedCurrency] = useState<'usd' | 'eur' | 'ngn' | 'gbp'>('usd');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const convertToFiat = (solBalance: number, currency?: string) => {
    const rate = rates[currency || selectedCurrency] || 0;
    return (solBalance * rate).toFixed(2);
  };

  const handleSelectWallet = (wallet) => {
    selectWallet(wallet);
    setIsSheetOpen(false);
    bottomSheetRef.current?.close();
  };

  const snapPoints = useMemo(() => ['40%'], []);

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
        <PageHeading>Send</PageHeading>
      </PageHeader>

      <PageBody>
        <View className="px-4 py-6 bg-white rounded-2xl mb-8">
          <View className="items-center mb-6">
            <Text className="text-2xl font-bold mb-2">Send SOL</Text>
            <Text className="text-sm text-muted-foreground text-center mb-4">
              Send SOL to another wallet address
            </Text>
          </View>

          <View className="gap-y-2 mb-8">
            <Text className="text-sm font-medium text-muted-foreground mb-2">Recipient</Text>
            <View className="flex-row items-center bg-secondary rounded-2xl px-4 py-3 mb-4">
              {/*<Ionicons name="person-outline" size={20} color="#666" className="mr-2" />*/}
              <SolarUserBoldDuotoneIcon color={"#666"} height={20}/>
              <TextInput
                placeholder="Solana address or pay URL or phone number"
                value={recipient}
                onChangeText={setRecipient}
                className="flex-1 h-12 text-base"
                placeholderTextColor="#999"
              />
              {recipient.length > 0 && (
                <TouchableOpacity onPress={() => setRecipient('')}>
                  <Ionicons name="close-circle" size={20} color="#666"/>
                </TouchableOpacity>
              )}
            </View>

            <Text className="text-sm font-medium text-muted-foreground mb-2">Amount</Text>
            <View className="flex-row items-center bg-secondary rounded-2xl px-4 py-3 mb-6">
              <Ionicons name="cash-outline" size={20} color="#666" className="mr-2"/>
              <TextInput
                placeholder="Amount in SOL"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                className="flex-1 h-12 text-base"
                placeholderTextColor="#999"
              />
              <Text className="font-medium text-muted-foreground">SOL</Text>
            </View>

            {amount && (
              <View className="bg-secondary/10 p-3 rounded-xl mb-6">
                <Text className="text-sm text-center text-muted-foreground">
                  ≈ {convertToFiat(parseFloat(amount) || 0)} {selectedCurrency.toUpperCase()}
                </Text>
              </View>
            )}

            <Button
              className="flex flex-row items-center py-4"
              onPress={handleSend}
              disabled={!recipient || !amount}
            >
              <Ionicons name="paper-plane" size={18} color="#fff" className="mr-2"/>
              <Text className="text-white font-semibold">Send Now</Text>
            </Button>

            {/*<ConfirmAndSend
                to="Fg6PaFpoGXkY..."
                amount={0.01}
                onConfirm={async () => {
                  const tx = await sendSol(activeWallet!, new PublicKey(recipient), 0.01)
                  Alert.alert('Success', `Tx hash: ${tx}`)
                }}
              />*/}

            <Text className="font-medium text-xs text-foreground text-center mt-4">
              Please verify the recipient address / phone number before sending
            </Text>
          </View>

          {activeWallet && (
            <View className="gap-y-2 border-t border-gray-100 pt-8">
              <Text className="text-sm font-medium text-muted-foreground mb-2">Sending from</Text>
              <TouchableOpacity
                onPress={() => {
                  setIsSheetOpen(true);
                  bottomSheetRef.current?.expand();
                }}
                activeOpacity={0.8}
              >
                <View className="flex-row items-center justify-between bg-secondary rounded-2xl p-4">
                  <View className="flex-row items-center">
                    <View>
                      <Text className="font-medium text-sm">Active Wallet</Text>
                      <Text className="text-lg text-muted-foreground" numberOfLines={1}>
                        {activeWallet.publicKey.toBase58().substring(0, 10)}...
                      </Text>
                    </View>
                  </View>
                  <Text className="font-semibold">
                    {walletsList.find(it => it.address === activeWallet.publicKey.toBase58())?.balance} SOL
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* BottomSheet for wallet selection */}
        <BottomSheet
          ref={bottomSheetRef}
          open={isSheetOpen}
          onOpenChange={() => setIsSheetOpen(false)}
          // index={-1}
          snapPoints={snapPoints}
          // enablePanDownToClose
          // onClose={() => setIsSheetOpen(false)}
        >
          <View className="p-4">
            <Text className="text-lg font-bold mb-4">Select Wallet</Text>
            {walletsList.map(wallet => (
              <TouchableOpacity
                key={wallet.address}
                className="flex-row items-center justify-between p-3 mb-2 rounded-xl bg-secondary"
                onPress={() => handleSelectWallet(wallet.address)}
              >
                <View>
                  <Text className="font-medium">{wallet.name || wallet.address.substring(0, 10) + '...'}</Text>
                  <Text className="text-xs text-muted-foreground">{wallet.address.substring(0, 20)}...</Text>
                </View>
                <Text className="font-semibold">{wallet.balance} SOL</Text>
              </TouchableOpacity>
            ))}
          </View>
        </BottomSheet>
      </PageBody>
    </PageContainer>
  )
}
