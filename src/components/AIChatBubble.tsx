import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import type { MealItem } from '@/src/utils/ai';

interface AIChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  mealItems?: MealItem[] | null;
  onLogItem?: (item: MealItem) => void;
}

export default function AIChatBubble({ role, content, mealItems, onLogItem }: AIChatBubbleProps) {
  const { colors } = useTheme();
  const isUser = role === 'user';

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isUser ? colors.maroon : colors.card,
            borderColor: isUser ? colors.maroon : colors.border,
          },
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
      >
        <Text
          style={[
            styles.content,
            { color: isUser ? '#FFFFFF' : colors.text },
          ]}
        >
          {content}
        </Text>

        {mealItems && mealItems.length > 0 && (
          <View style={styles.itemsContainer}>
            {mealItems.map((item, idx) => (
              <View
                key={item.id ?? idx}
                style={[styles.itemCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
              >
                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={[styles.itemHall, { color: colors.textMuted }]} numberOfLines={1}>
                  {item.hall}
                </Text>

                <View style={styles.macroRow}>
                  <Text style={[styles.macroPill, { color: colors.text }]}>
                    {item.calories} cal
                  </Text>
                  <Text style={[styles.macroPill, { color: '#5B7FFF' }]}>
                    {item.protein_g}g P
                  </Text>
                  <Text style={[styles.macroPill, { color: '#FFD60A' }]}>
                    {item.carbs_g}g C
                  </Text>
                  <Text style={[styles.macroPill, { color: '#E87722' }]}>
                    {item.fat_g}g F
                  </Text>
                </View>

                {onLogItem && (
                  <Pressable
                    style={[styles.logButton, { backgroundColor: colors.green }]}
                    onPress={() => onLogItem(item)}
                  >
                    <Text style={styles.logButtonText}>Log this</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  rowUser: {
    alignItems: 'flex-end',
  },
  rowAssistant: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    borderBottomLeftRadius: 4,
  },
  content: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 21,
  },
  itemsContainer: {
    marginTop: 10,
    gap: 8,
  },
  itemCard: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
  },
  itemName: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 15,
    marginBottom: 2,
  },
  itemHall: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    marginBottom: 8,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  macroPill: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
  },
  logButton: {
    alignSelf: 'flex-start',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  logButtonText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
});
