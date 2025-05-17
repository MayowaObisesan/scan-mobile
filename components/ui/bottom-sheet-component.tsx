import React, {useEffect, useRef} from 'react';
import {Animated, Dimensions, Modal, PanResponder, StyleSheet, TouchableWithoutFeedback, View} from 'react-native';
import {ThemedView} from "~/components/ThemedView";
import {Text} from "~/components/ui/text";

interface CustomBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  snapPoints?: number[]; // e.g. [height1, height2]
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export const BottomSheetComponent: React.FC<CustomBottomSheetProps> = (
  {
    open,
    onOpenChange = () => {},  // default to no-op function
    children,
    snapPoints = [SCREEN_HEIGHT * 0.5, 0], // [open, closed]
  }) => {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Animate in/out
  useEffect(() => {
    Animated.timing(translateY, {
      toValue: open ? snapPoints[0] : SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      if (!open) onOpenChange(false);
    });
  }, [open, snapPoints, onOpenChange, translateY]);

  // PanResponder for drag-to-close
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 5,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          translateY.setValue(snapPoints[0] + gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 100) {
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onOpenChange(false));
        } else {
          Animated.timing(translateY, {
            toValue: snapPoints[0],
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={() => onOpenChange(false)}>
      <TouchableWithoutFeedback onPress={() => onOpenChange(false)}>
        <View style={styles.backdrop}/>
      </TouchableWithoutFeedback>
      <Animated.View
        style={[
          styles.sheet,
          {transform: [{translateY}]},
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.handle}/>
        {children}
      </Animated.View>
    </Modal>
  );
};

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
  backdrop: {
    flex: 1,
    backgroundColor: '#0006',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 100,
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginBottom: 12,
  },
});
