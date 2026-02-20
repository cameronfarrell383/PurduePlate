import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';

interface Props {
  visible: boolean;
  message: string;
  color?: string;
  onDismiss?: () => void;
}

export default function GoalHitBanner({ visible, message, color, onDismiss }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-80);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bgColor = color ?? colors.green;

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 15 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      timer.current = setTimeout(() => {
        translateY.value = withSpring(-80, { damping: 15 });
        setTimeout(() => {
          onDismiss?.();
        }, 400);
      }, 3000);
    } else {
      translateY.value = -80;
    }

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top + 10, backgroundColor: bgColor },
        animStyle,
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9998,
    marginHorizontal: 16,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    textAlign: 'center',
  },
});
