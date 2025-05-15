import React, { useState, useEffect } from 'react';
    import { View, TextInput, StyleSheet, TextInputProps, TouchableOpacity, Text } from 'react-native';
    import Animated, {
      useSharedValue,
      useAnimatedStyle,
      withRepeat,
      withTiming,
      interpolateColor,
      Easing,
    } from 'react-native-reanimated';
    import { Ionicons } from '@expo/vector-icons';

    export function AIInputBoxEnhanced(props: TextInputProps) {
      const [isFocused, setIsFocused] = useState(false);
      const [text, setText] = useState('');
      const glowAnimation = useSharedValue(0);

      useEffect(() => {
        glowAnimation.value = withRepeat(
          withTiming(1, { duration: 2000, easing: Easing.ease }),
          -1,
          true
        );
      }, []);

      const animatedGlowStyle = useAnimatedStyle(() => {
        const borderColor = interpolateColor(
          glowAnimation.value,
          [0, 1],
          ['#3b82f6', '#f472b6']
        );

        return {
          borderColor,
          shadowColor: borderColor,
          shadowOpacity: isFocused ? 0.8 : 0.5,
          shadowRadius: isFocused ? 12 : 8,
          borderWidth: 2,
        };
      });

      return (
        <Animated.View style={[styles.container, animatedGlowStyle]}>
          <TouchableOpacity style={styles.searchIcon}>
            <Ionicons name="search" size={20} color="#a5b4fc" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Ask AI anything..."
            placeholderTextColor="#a5b4fc"
            value={text}
            onChangeText={(value) => {
              setText(value);
              props.onChangeText?.(value);
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
          {text.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setText('')}
            >
              <Ionicons name="close-circle" size={20} color="#a5b4fc" />
            </TouchableOpacity>
          )}
          <Text style={styles.charCounter}>{text.length}/100</Text>
          <TouchableOpacity style={styles.voiceButton}>
            <Ionicons name="mic" size={20} color="#a5b4fc" />
          </TouchableOpacity>
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
        position: 'relative',
      },
      searchIcon: {
        position: 'absolute',
        left: 12,
        top: 18,
        zIndex: 2,
      },
      input: {
        height: 56,
        paddingLeft: 40, // space for search icon
        paddingRight: 56, // space for clear/voice icons
        fontSize: 16,
        color: '#fff',
        backgroundColor: '#F8F8Fb',
        borderRadius: 14,
      },
      clearButton: {
        position: 'absolute',
        right: 40,
        top: 15,
        zIndex: 2,
      },
      charCounter: {
        position: 'absolute',
        right: 10,
        bottom: 5,
        fontSize: 12,
        color: '#a5b4fc',
      },
      voiceButton: {
        position: 'absolute',
        right: 10,
        top: 15,
        zIndex: 2,
      },
    });
