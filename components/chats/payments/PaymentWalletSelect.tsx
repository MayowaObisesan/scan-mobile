// components/payments/PaymentWalletsSheet.tsx
import React, {useRef, useState} from 'react';
import {ScrollView, TextInput, TouchableOpacity, View} from 'react-native';
import {Ionicons} from "@expo/vector-icons";
import {useWallets} from "~/hooks/useWallets";
import {I_Profile} from "~/hooks/useProfile";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from '~/components/ui/accordion';
import {Keypair} from "@solana/web3.js";
import {Text} from "~/components/ui/text"
// import {BottomSheetModal} from "@gorhom/bottom-sheet";
import {
  BottomSheetComponent,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle
} from "~/components/ui/bottom-sheet-component";
import {Button} from "~/components/ui/button";

interface PaymentFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentFormData) => void;
  type: 'link' | 'payment';
  recipient: I_Profile;
}

export interface PaymentFormData {
  walletKeypair: Keypair | null;
  walletId: string;
  amount: string;
  label: string;
  memo: string;
  message: string;
}

export const PaymentFormSheet: React.FC<PaymentFormSheetProps> = (
  {
    isOpen,
    onClose,
    onSubmit,
    type,
    recipient,
  }) => {
  const {walletsList, isLoading, activeWallet, selectWallet} = useWallets();
  const paymentFormSheetRef = useRef(null);

  const [formData, setFormData] = useState<PaymentFormData>({
    walletKeypair: activeWallet,
    walletId: '',
    amount: '',
    label: '',
    memo: 'Transfer from Scan',
    message: '',
  });
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  const selectedWallet = walletsList.find(w => w.id === formData.walletId);

  const handleSubmit = () => {
    onSubmit(formData);
    setFormData({walletId: "", amount: '', label: '', memo: '', message: '', walletKeypair: null});
    onClose();
  };

  return (
    <BottomSheetComponent open={isOpen} onOpenChange={onClose}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>
            {type === 'link' ? `Create Payment Link ${recipient?.username}` : `Send to ${recipient?.username}`}
          </BottomSheetTitle>
        </BottomSheetHeader>
        <View className="flex flex-col gap-4 py-4">
          {/* New Send to field */}
          {/*<View className="p-4 border border-gray-300 rounded-lg bg-background/50">
            <Text className="text-sm text-gray-500 mb-1">Send to</Text>
            <Text className="text-base font-medium">{recipient?.username}</Text>
          </View>*/}

          {/* Custom Select */}
          <View className="relative">
            <TouchableOpacity
              onPress={() => setIsSelectOpen(!isSelectOpen)}
              className="p-4 border border-gray-300 rounded-lg bg-background flex-row justify-between items-center"
            >
              <View>
                <Text className="text-sm font-medium">From</Text>
                {selectedWallet ? (
                  <>
                    <Text className="text-base font-medium">{selectedWallet.name}</Text>
                    <Text className="text-sm text-gray-500">Balance: {selectedWallet.balance} SOL</Text>
                  </>
                ) : (
                  <Text className="text-base text-gray-500">Select Wallet</Text>
                )}
              </View>
              <Ionicons
                name={isSelectOpen ? "chevron-up" : "chevron-down"}
                size={24}
                color="#666"
              />
            </TouchableOpacity>

            {/* Dropdown Options */}
            {isSelectOpen && (
              <ScrollView
                className="absolute top-full left-0 right-0 mt-1 border border-gray-300 rounded-lg bg-background z-50 max-h-40">
                <ScrollView>
                  {walletsList?.map((wallet) => (
                    <TouchableOpacity
                      key={wallet.id}
                      onPress={() => {
                        setFormData({...formData, walletId: wallet.id, walletKeypair: wallet.keypair});
                        setIsSelectOpen(false);
                      }}
                      className={`p-4 border-b border-gray-200 ${
                        formData.walletId === wallet.id ? 'bg-primary/10' : ''
                      }`}
                    >
                      <Text className="text-base font-medium">{wallet.name}</Text>
                      <Text className="text-sm text-gray-500">Balance: {wallet.balance} SOL</Text>
                      <Text className="text-xs text-gray-500">{wallet.address}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </ScrollView>
            )}
          </View>

          <TextInput
            className="p-4 border border-input rounded-lg bg-background text-secondary-foreground"
            placeholder="Amount"
            value={formData.amount}
            onChangeText={(text) => setFormData({...formData, amount: text})}
            keyboardType="numeric"
            placeholderTextColor="#666"
          />
          <TextInput
            className="p-4 border border-gray-300 rounded-lg bg-background text-secondary-foreground"
            placeholder="Add a short description"
            value={formData.label}
            onChangeText={(text) => setFormData({...formData, label: text})}
            placeholderTextColor="#666"
          />
          {/*<TextInput
            className="p-2 border border-gray-300 rounded-lg bg-background"
            placeholder="Memo"
            value={formData.memo}
            onChangeText={(text) => setFormData({ ...formData, memo: text })}
            placeholderTextColor="#666"
          />*/}

          <Accordion
            collapsible
            type='multiple'
            // defaultValue={['item-1']}
            className='w-full max-w-sm native:max-w-md'
          >
            <AccordionItem value='item-1'>
              <AccordionTrigger>
                <Text className={"text-sm"}>Additional Payment information</Text>
              </AccordionTrigger>
              <AccordionContent>
                <Text>Yes. It adheres to the WAI-ARIA design pattern.</Text>
                <TextInput
                  className="p-2 border border-gray-300 rounded-lg"
                  placeholder="(optional) Additional information about this transfer or payment"
                  value={formData.message}
                  onChangeText={(text) => setFormData({...formData, message: text})}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#666"
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Button
            onPress={handleSubmit}
            className="p-4 rounded-lg"
          >
            <Text className="text-center font-medium">
              {type === 'link' ? 'Create Link' : 'Send Payment'}
            </Text>
          </Button>
        </View>
      </BottomSheetContent>
    </BottomSheetComponent>
  );
};
