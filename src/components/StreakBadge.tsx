import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Box, Text } from '../theme/restyleTheme';
import MetallicShimmer from './MetallicShimmer';
import type { Badge } from '../utils/streaks';

// ─── Direct color constants ─────────────────────────────────────────────────
const C = {
  silver: '#A8A9AD',
  silverLight: '#C8C9CC',
  textDim: '#9A9A9E',
  textMuted: '#6B6B6F',
  text: '#1A1A1A',
  offWhite: '#FAFAFA',
};

// Gold metallic gradient stops
const GOLD_GRADIENT: readonly [string, string, string, string, string] = [
  '#8B6914', '#C5A55A', '#E8D5A3', '#C5A55A', '#8B6914',
];
const GOLD_LOCATIONS: readonly [number, number, number, number, number] = [
  0, 0.3, 0.5, 0.7, 1.0,
];

interface Props {
  badge: Badge;
  size?: 'small' | 'large';
}

export default function StreakBadge({ badge, size = 'small' }: Props) {
  const isLarge = size === 'large';
  const circleSize = isLarge ? 64 : 44;
  const emojiSize = isLarge ? 28 : 20;
  const [shimmerPlayed, setShimmerPlayed] = useState(false);

  // Play shimmer once when badge transitions to earned
  useEffect(() => {
    if (badge.earned && !shimmerPlayed) {
      const timer = setTimeout(() => setShimmerPlayed(true), 400);
      return () => clearTimeout(timer);
    }
  }, [badge.earned, shimmerPlayed]);

  return (
    <Box alignItems="center">
      <View
        style={{
          width: circleSize,
          height: circleSize,
          borderRadius: circleSize / 2,
          overflow: 'hidden',
          opacity: badge.earned ? 1 : 0.4,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {badge.earned ? (
          // Unlocked: gold metallic gradient background + shimmer
          <>
            <LinearGradient
              colors={[...GOLD_GRADIENT]}
              locations={[...GOLD_LOCATIONS]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: 'absolute',
                width: circleSize,
                height: circleSize,
              }}
            />
            <Text style={{ fontSize: emojiSize, textAlign: 'center' }}>
              {badge.emoji}
            </Text>
            <MetallicShimmer
              width={circleSize}
              height={circleSize}
              borderRadius={circleSize / 2}
              play={shimmerPlayed}
            />
          </>
        ) : (
          // Locked: silver fill + flat silver lock icon
          <>
            <View
              style={{
                position: 'absolute',
                width: circleSize,
                height: circleSize,
                backgroundColor: C.offWhite,
              }}
            />
            <Feather name="lock" size={emojiSize - 4} color={C.silver} />
          </>
        )}
      </View>

      <Text
        variant="dim"
        style={{
          textAlign: 'center',
          marginTop: 6,
          maxWidth: circleSize + 16,
          color: badge.earned ? (isLarge ? C.text : C.textMuted) : C.textDim,
        }}
        numberOfLines={2}
      >
        {badge.name}
      </Text>

      {isLarge && (
        <Text
          variant="dim"
          style={{
            textAlign: 'center',
            marginTop: 2,
            maxWidth: circleSize + 24,
            color: C.textMuted,
          }}
          numberOfLines={1}
        >
          {badge.description}
        </Text>
      )}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// OLD CODE — commented out, not deleted
// ════════════════════════════════════════════════════════════════════════════════
//
// import { View, Text, StyleSheet } from 'react-native';
// import { useTheme } from '../context/ThemeContext';
//
// Old badge used flat bg colors (orange for streak, blue for water, maroon for logging).
// Locked badges showed emoji 🔒. Now uses Feather lock icon + silver bg.
// Unlocked badges now have gold metallic gradient bg + MetallicShimmer on unlock.
//
// const styles = StyleSheet.create({
//   container: { alignItems: 'center' },
//   circle: { justifyContent: 'center', alignItems: 'center' },
//   name: { fontFamily: 'DMSans_500Medium', textAlign: 'center', marginTop: 6 },
//   description: { fontFamily: 'DMSans_400Regular', fontSize: 11, textAlign: 'center', marginTop: 2 },
// });
