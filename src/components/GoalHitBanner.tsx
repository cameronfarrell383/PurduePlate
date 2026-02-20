import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerHaptic } from '@/src/utils/haptics';
import { Text } from '@/src/theme/restyleTheme';
import GradientText from './GradientText';

interface Props {
  visible: boolean;
  message: string;
  /** 'goal' = gold metallic bg + maroon text, 'streak' = maroon bg + gold gradient text, 'water' = steel blue bg + white text */
  variant?: 'goal' | 'streak' | 'water';
  /** Legacy color prop — if set and no variant, uses this as bg with white text */
  color?: string;
  onDismiss?: () => void;
}

export default function GoalHitBanner({ visible, message, variant, color, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-80);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine variant from legacy color if not explicitly set
  const effectiveVariant = variant ?? (color === '#4A7FC5' ? 'water' : 'goal');

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 15 });
      triggerHaptic('medium');

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

  const containerStyle = {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    zIndex: 9998,
    marginHorizontal: 16,
    top: insets.top + 10,
    borderRadius: 8,
    overflow: 'hidden' as const,
  };

  if (effectiveVariant === 'goal') {
    // Gold metallic gradient bg + maroon text
    return (
      <Animated.View style={[containerStyle, animStyle]}>
        <LinearGradient
          colors={['#8B6914', '#C5A55A', '#E8D5A3', '#C5A55A', '#8B6914']}
          locations={[0, 0.3, 0.5, 0.7, 1.0]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingVertical: 14, paddingHorizontal: 20 }}
        >
          <Text
            style={{
              color: '#861F41',
              fontSize: 15,
              fontFamily: 'DMSans_700Bold',
              textAlign: 'center',
            }}
          >
            {message}
          </Text>
        </LinearGradient>
      </Animated.View>
    );
  }

  if (effectiveVariant === 'streak') {
    // Maroon bg + gold GradientText
    return (
      <Animated.View
        style={[
          containerStyle,
          { backgroundColor: '#861F41', paddingVertical: 14, paddingHorizontal: 20 },
          animStyle,
        ]}
      >
        <View style={{ alignItems: 'center' }}>
          <GradientText
            text={message}
            gradientType="gold"
            fontSize={15}
            fontFamily="DMSans_700Bold"
          />
        </View>
      </Animated.View>
    );
  }

  // Water variant or fallback: solid bg + white text
  const bgColor = effectiveVariant === 'water' ? '#4A7FC5' : (color ?? '#861F41');
  return (
    <Animated.View
      style={[
        containerStyle,
        { backgroundColor: bgColor, paddingVertical: 14, paddingHorizontal: 20 },
        animStyle,
      ]}
    >
      <Text
        style={{
          color: '#FFFFFF',
          fontSize: 15,
          fontFamily: 'DMSans_600SemiBold',
          textAlign: 'center',
        }}
      >
        {message}
      </Text>
    </Animated.View>
  );
}
