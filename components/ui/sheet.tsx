// components/ui/sheet.tsx
import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { ThemedView } from '../ThemedView';
import {Text} from "~/components/ui/text";

interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  return (
    <Modal
      hardwareAccelerated
      animationType="fade"
      transparent={true}
      // presentationStyle={'pageSheet'}
      visible={open}
      onRequestClose={() => onOpenChange?.(false)}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={() => onOpenChange?.(false)}
      >
        <View style={styles.content} onStartShouldSetResponder={() => true}>
          {children}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export function SheetContent({ children }: { children: React.ReactNode }) {
  const { height } = useWindowDimensions();
  return (
    <View
      className="bg-primary-foreground rounded-t-[10px] p-6"
      style={[styles.sheetContent, { maxHeight: height * 0.9 }]}
    >
      {children}
    </View>
  );
}

export function SheetHeader({ children }: { children: React.ReactNode }) {
  return (
    <ThemedView className="flex-row items-center justify-between pb-4">
      {children}
    </ThemedView>
  );
}

export function SheetTitle({ children }: { children: React.ReactNode }) {
  return (
    <ThemedView>
      <Text className="text-xl font-semibold">{children}</Text>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  content: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  sheetContent: {
    width: '100%',
  },
});
