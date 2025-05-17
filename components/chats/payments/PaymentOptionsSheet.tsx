// components/payments/PaymentOptionsSheet.tsx
import React, { useRef } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '~/components/ui/sheet';
import {Button} from "~/components/ui/button";
import {BottomSheetComponent, BottomSheetContent, BottomSheetHeader, BottomSheetTitle} from "~/components/ui/bottom-sheet-component";
// import {BottomSheetModal, BottomSheetView} from "@gorhom/bottom-sheet";
import {Text} from "~/components/ui/text";
import SolarLinkBoldDuotoneIcon from "~/icon/LinkBoldDuotoneIcon";
import SolarCardSendIcon from "~/icon/CardSendIcon";

interface PaymentOptionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateLink: () => void;
  onMakePayment: () => void;
}

export const PaymentOptionsSheet: React.FC<PaymentOptionsSheetProps> = ({
  isOpen,
  onClose,
  onCreateLink,
  onMakePayment,
}) => {
  const paymentOptionSheetRef = useRef(null);

  return (
    <BottomSheetComponent snapPoints={[25]} open={isOpen} onOpenChange={onClose}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>Payment Options</BottomSheetTitle>
        </BottomSheetHeader>
        <View className="flex flex-row items-center justify-around gap-4 py-4">
          <View className={"justify-center items-center gap-2"}>
            <Button
              size={"icon"}
              onPress={onCreateLink}
              className="flex-row items-center p-4 w-24 h-24 rounded-full dark:bg-secondary"
            >
              <SolarLinkBoldDuotoneIcon color={"white"} width={40} height={40} />
            </Button>
            <Text className="font-medium">Payment Link</Text>
          </View>
          <View className={"justify-center items-center gap-2"}>
            <Button
              size={"icon"}
              onPress={onMakePayment}
              className="flex-row items-center p-4 w-24 h-24 rounded-full dark:bg-secondary"
            >
              <SolarCardSendIcon color={"white"} width={40} height={40} />
            </Button>
            <Text className="font-medium">Make Payment</Text>
          </View>
          {/*<TouchableOpacity
            onPress={onCreateLink}
            className="flex-row items-center p-4 rounded-lg bg-primary"
          >
            <Text className="text-white font-medium">Create Payment Link</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onMakePayment}
            className="flex-row items-center p-4 rounded-lg bg-primary"
          >
            <Text className="text-white font-medium">Make Payment</Text>
          </TouchableOpacity>*/}
        </View>
      </BottomSheetContent>
    </BottomSheetComponent>
  );
};
