import React from 'react';
import { Text, StyleSheet } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

const GOLD_COLORS = ['#8B6914', '#C5A55A', '#E8D5A3', '#C5A55A', '#8B6914'] as const;
const SILVER_COLORS = ['#6B6B6F', '#A8A9AD', '#D8D8DC', '#A8A9AD', '#6B6B6F'] as const;
const LOCATIONS = [0, 0.3, 0.5, 0.7, 1.0] as const;

// Flat fallback colors
const GOLD_FLAT = '#C5A55A';
const SILVER_FLAT = '#A8A9AD';

interface GradientTextProps {
  text: string;
  gradientType: 'gold' | 'silver';
  fontSize?: number;
  fontFamily?: string;
  style?: object;
}

export default function GradientText({
  text,
  gradientType,
  fontSize = 32,
  fontFamily = 'Outfit_700Bold',
  style,
}: GradientTextProps) {
  const colors = gradientType === 'gold' ? GOLD_COLORS : SILVER_COLORS;
  const flatColor = gradientType === 'gold' ? GOLD_FLAT : SILVER_FLAT;

  const textStyle = {
    fontSize,
    fontFamily,
    ...style,
  };

  try {
    return (
      <MaskedView
        maskElement={
          <Text style={[textStyle, styles.maskText]}>{text}</Text>
        }
      >
        <LinearGradient
          colors={[...colors]}
          locations={[...LOCATIONS]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={[textStyle, styles.invisible]}>{text}</Text>
        </LinearGradient>
      </MaskedView>
    );
  } catch {
    // Fallback to flat color if MaskedView has issues
    return (
      <Text style={[textStyle, { color: flatColor }]}>{text}</Text>
    );
  }
}

const styles = StyleSheet.create({
  maskText: {
    backgroundColor: 'transparent',
  },
  invisible: {
    opacity: 0,
  },
});
