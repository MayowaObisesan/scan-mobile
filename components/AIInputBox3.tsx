import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TextInputProps, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolateColor,
  Easing,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export function AIInputBox3(props: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const glowAnimation = useSharedValue(0);
  const shimmerAnimation = useSharedValue(0);
  const inputWidth = useSharedValue(0);

  useEffect(() => {
    glowAnimation.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.ease }),
      -1,
      true
    );

    shimmerAnimation.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const handleLayout = (event) => {
    inputWidth.value = event.nativeEvent.layout.width;
  };

  const animatedGlowStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      glowAnimation.value,
      [0, 1],
      ['#3b82f6', '#f472b6']
    );

    const shadowOpacity = isFocused ? 0.8 : 0.5;

    return {
      borderColor,
      shadowColor: borderColor,
      shadowOpacity,
      shadowRadius: isFocused ? 12 : 8,
      borderWidth: 2,
    };
  });

  const animatedShimmerStyle = useAnimatedStyle(() => {
    if (inputWidth.value === 0) return {};

    const shimmerWidth = inputWidth.value * 0.5;
    const translateX = interpolate(
      shimmerAnimation.value,
      [0, 1],
      [-shimmerWidth, inputWidth.value],
      Extrapolate.CLAMP
    );

    return {
      width: shimmerWidth,
      transform: [{ translateX }],
    };
  });

  return (
    <Animated.View
      style={[styles.container, animatedGlowStyle]}
      onLayout={handleLayout}
    >
      <AnimatedLinearGradient
        colors={['transparent', 'rgba(255, 255, 255, 0.3)', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.shimmer, animatedShimmerStyle]}
      />
      <TextInput
        style={styles.input}
        placeholder="Ask AI anything..."
        placeholderTextColor="#a5b4fc"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginVertical: 16,
    padding: 2,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    opacity: 0.7,
  },
  input: {
    height: 56,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    // backgroundColor: '#18181b',
    backgroundColor: '#F8F8Fb',
    borderRadius: 12,
  },
});
