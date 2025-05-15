// components/ui/bottom-sheet.tsx
import React, { useCallback, useMemo } from 'react';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  useBottomSheetModal,
} from '@gorhom/bottom-sheet';
import { ThemedView } from '../ThemedView';
import { Text } from './text';
import { StyleSheet } from 'react-native';
import {BottomSheetModalStackBehavior} from "@gorhom/bottom-sheet/lib/typescript/components/bottomSheetModal";

interface BottomSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  snapPoints?: (string | number)[];
  stackBehavior?: BottomSheetModalStackBehavior;
}

export const BottomSheet = React.forwardRef<BottomSheetModal, BottomSheetProps>(
  ({ children, open, onOpenChange, snapPoints: customSnapPoints, stackBehavior: customStackBehavior }, ref) => {
    const { dismiss } = useBottomSheetModal();
    const snapPoints = useMemo(() => customSnapPoints || ['50%'], [customSnapPoints]);
    const stackBehavior = useMemo(() => customStackBehavior || ['50%'], [customStackBehavior]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
        />
      ),
      []
    );

    React.useEffect(() => {
      if (open) {
        (ref as React.RefObject<BottomSheetModal>)?.current?.present();
      } else {
        dismiss();
      }
    }, [open, ref, dismiss]);

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        stackBehavior={"push"}
        onDismiss={() => onOpenChange?.(false)}
        enablePanDownToClose
        enableDynamicSizing
        detached
        bottomInset={8}
        style={styles.sheetContainer}
      >
        <BottomSheetView style={styles.contentContainer}>
          {children}
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

export function BottomSheetContent({ children }: { children: React.ReactNode }) {
  return (
    <ThemedView className="p-6 rounded-2xl">
      {children}
    </ThemedView>
  );
}

export function BottomSheetHeader({ children }: { children: React.ReactNode }) {
  return (
    <ThemedView className="flex-row items-center justify-between pb-4">
      {children}
    </ThemedView>
  );
}

export function BottomSheetTitle({ children }: { children: React.ReactNode }) {
  return (
    <ThemedView>
      <Text className="text-xl font-semibold">{children}</Text>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    marginHorizontal: 10,
    borderRadius: 40,
  },
  contentContainer: {
    flex: 1,
    borderRadius: 40,
  },
});
