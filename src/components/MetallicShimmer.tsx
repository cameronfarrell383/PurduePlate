import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface MetallicShimmerProps {
  width: number;
  height: number;
  borderRadius?: number;
  play: boolean;
}

export default function MetallicShimmer({
  width,
  height,
  borderRadius = 0,
  play,
}: MetallicShimmerProps) {
  const translateX = useSharedValue(-width);

  useEffect(() => {
    if (play) {
      // Reset to start position then sweep across
      translateX.value = -width;
      translateX.value = withTiming(width, {
        duration: 800,
        easing: Easing.inOut(Easing.quad),
      });
    }
  }, [play, width, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        { width, height, borderRadius, overflow: 'hidden' },
      ]}
    >
      <Animated.View style={[styles.shimmer, { width, height }, animatedStyle]}>
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255,255,255,0.4)',
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.3 }}
          style={{ width, height }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
