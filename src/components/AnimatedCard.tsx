import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Card } from '../theme/restyleTheme';
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type CardProps = React.ComponentProps<typeof Card>;

interface AnimatedCardProps extends CardProps {
  onPress?: () => void;
}

export default function AnimatedCard({
  onPress,
  children,
  ...cardProps
}: AnimatedCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.97, {
      duration: 100,
      easing: Easing.out(Easing.quad),
    });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 150,
    });
  }, [scale]);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={animatedStyle}
    >
      <Card {...cardProps}>{children}</Card>
    </AnimatedPressable>
  );
}
