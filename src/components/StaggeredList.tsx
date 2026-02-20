import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface StaggeredListProps {
  children: React.ReactNode;
  staggerDelay?: number;
  initialDelay?: number;
  translateY?: number;
}

function StaggeredItem({
  index,
  staggerDelay,
  initialDelay,
  translateY,
  children,
}: {
  index: number;
  staggerDelay: number;
  initialDelay: number;
  translateY: number;
  children: React.ReactNode;
}) {
  const opacity = useSharedValue(0);
  const offsetY = useSharedValue(translateY);

  useEffect(() => {
    const delay = initialDelay + index * staggerDelay;
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    offsetY.value = withDelay(
      delay,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
  }, [index, staggerDelay, initialDelay, translateY, opacity, offsetY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offsetY.value }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

export default function StaggeredList({
  children,
  staggerDelay = 50,
  initialDelay = 0,
  translateY = 15,
}: StaggeredListProps) {
  const items = React.Children.toArray(children);

  return (
    <View>
      {items.map((child, index) => (
        <StaggeredItem
          key={index}
          index={index}
          staggerDelay={staggerDelay}
          initialDelay={initialDelay}
          translateY={translateY}
        >
          {child}
        </StaggeredItem>
      ))}
    </View>
  );
}
