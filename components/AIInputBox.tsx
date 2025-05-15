import React, { useState, useEffect } from 'react';
import { TextInput, View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';

const AIInputBox = (props) => {
  const [isFocused, setIsFocused] = useState(false);
  const glowAnimation = useSharedValue(0); // Shared value for animation progress (0 to 1)

  // Define glow colors - you can customize these
  const glowColorFocused = props.glowColorFocused || '#00FFFF'; // Bright cyan for focused glow
  const glowColorBlur = props.glowColorBlur || '#6A0DAD';     // Purple for blurred glow
  const accentColorFocused = props.accentColorFocused || '#7DF9FF'; // Lighter cyan for border accent
  const accentColorBlur = props.accentColorBlur || '#C37AFF';   // Lighter purple for border accent

  // Container and input styles
  const containerBackgroundColor = props.containerBackgroundColor || '#1A1A2E'; // Dark background
  const inputTextColor = props.inputTextColor || '#E0E0FF';           // Light text color
  const placeholderTextColor = props.placeholderTextColor || '#9090B0'; // Softer placeholder

  useEffect(() => {
    // Start the looping animation
    glowAnimation.value = withRepeat(
      withTiming(1, {
        duration: 1800, // Duration of one pulse
        easing: Easing.bezier(0.42, 0, 0.58, 1), // Smooth in-out easing
      }),
      -1,   // Repeat indefinitely
      true  // Auto-reverse the animation (pulsates back and forth)
    );
  }, [glowAnimation]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const currentGlowBaseColor = isFocused ? glowColorFocused : glowColorBlur;
    const currentAccentBaseColor = isFocused ? accentColorFocused : accentColorBlur;

    // Interpolate shadow opacity for a smoother pulse
    const shadowOpacityValue = isFocused
      ? 0.5 + glowAnimation.value * 0.5 // More intense when focused: 0.5 to 1.0
      : 0.25 + glowAnimation.value * 0.25; // Subtler when blurred: 0.25 to 0.5

    // Interpolate shadow radius for a growing/shrinking glow
    const shadowRadiusValue = isFocused
      ? 6 + glowAnimation.value * 10 // Larger glow when focused: 6 to 16
      : 4 + glowAnimation.value * 6;  // Smaller glow when blurred: 4 to 10

    // Interpolate border color for a subtle shift
    const borderColorValue = interpolateColor(
      glowAnimation.value,
      [0, 0.5, 1],
      [
        currentGlowBaseColor,
        currentAccentBaseColor,
        currentGlowBaseColor,
      ]
    );

    if (Platform.OS === 'ios') {
      return {
        shadowColor: currentGlowBaseColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: shadowOpacityValue,
        shadowRadius: shadowRadiusValue,
        borderColor: borderColorValue,
        borderWidth: 1.5, // Constant border width for iOS, glow is from shadow
      };
    } else {
      // Android: Elevation doesn't offer colored or highly customizable glows.
      // We'll rely more on an animated border.
      const borderWidthValue = isFocused
        ? 2 + glowAnimation.value * 1.5 // Pulsating border: 2px to 3.5px
        : 1.5 + glowAnimation.value * 1; // Pulsating border: 1.5px to 2.5px
      return {
        borderColor: borderColorValue,
        borderWidth: borderWidthValue,
        // Elevation can provide a base shadow, but it won't be the primary glow effect
        elevation: isFocused ? 5 + Math.round(glowAnimation.value * 5) : 2,
      };
    }
  });

  return (
    <Animated.View style={[styles.baseContainer, animatedContainerStyle, props.containerStyle]}>
      <TextInput
        style={[
          styles.input,
          { color: inputTextColor, backgroundColor: containerBackgroundColor }, // Ensure input bg matches container or is transparent
          props.style,
        ]}
        placeholderTextColor={placeholderTextColor}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props} // Spread other TextInput props
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    borderRadius: 12,
    // Default background color, will be overridden by props if provided
    backgroundColor: '#1A1A2E',
    // Add some margin to allow the glow/shadow to be visible
    // Margin might need adjustment based on shadowRadius
    marginVertical: 10,
    marginHorizontal: 5,
  },
  input: {
    height: 55,
    paddingHorizontal: 20,
    fontSize: 16,
    borderRadius: 11, // Slightly less than container for inset look if border is thick
    borderWidth: 0, // We handle border on the Animated.View container
  },
});

export default AIInputBox;
