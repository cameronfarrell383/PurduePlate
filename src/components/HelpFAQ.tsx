import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';

export interface HelpFAQProps {
  visible: boolean;
  onClose: () => void;
}

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'How are my calorie goals calculated?',
    a: 'CampusPlate uses the Mifflin-St Jeor equation to estimate your daily calorie needs based on your weight, height, age, gender, and activity level. Your selected goal (cut, maintain, or bulk) adjusts the target accordingly.',
  },
  {
    q: 'Where does the menu data come from?',
    a: "Menu data is pulled directly from Virginia Tech's official dining services website (FoodPro) and updated daily. Menus are subject to change — always check signage at the dining location.",
  },
  {
    q: 'Can I track meals from off-campus restaurants?',
    a: "Currently, CampusPlate only supports on-campus dining locations listed on VT's official dining site. Off-campus meal tracking may be added in a future update.",
  },
  {
    q: 'How do I change my nutrition goals?',
    a: "Go to the More tab and tap 'Nutrition Goals'. You can set custom calorie and macro targets, or recalculate based on your current body stats.",
  },
  {
    q: 'What does the water tracker measure?',
    a: "The water tracker counts ounces of water consumed. Tap the quick-add buttons to log water throughout the day. You can customize your daily goal in the More tab under 'Water Goal'.",
  },
  {
    q: 'How do I reset my password?',
    a: "On the login screen, tap 'Forgot Password?' and enter your email. You'll receive a password reset link.",
  },
  {
    q: 'Is my data private?',
    a: 'Your data is stored securely and is only accessible to you. CampusPlate does not share personal information with third parties.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Contact the development team to request account deletion. This feature will be added in a future update.',
  },
];

// ── Defined outside component to prevent remount on re-render ──

function FAQItem({ question, answer, expanded, onToggle }: {
  question: string;
  answer: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View>
      <TouchableOpacity
        style={st.faqQuestion}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={[st.questionText, { color: colors.text, fontFamily: 'DMSans_600SemiBold', flex: 1 }]}>
          {question}
        </Text>
        <Text style={[st.chevron, { color: colors.textDim }]}>
          {expanded ? '▾' : '▸'}
        </Text>
      </TouchableOpacity>
      {expanded && (
        <View style={st.answerWrap}>
          <Text style={[st.answerText, { color: colors.textMuted, fontFamily: 'DMSans_400Regular' }]}>
            {answer}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function HelpFAQ({ visible, onClose }: HelpFAQProps) {
  const { colors } = useTheme();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggle = (i: number) => {
    setExpandedIndex((prev) => (prev === i ? null : i));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[st.container, { backgroundColor: colors.background }]}>

        {/* Header */}
        <View style={[st.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={st.headerSide} activeOpacity={0.6}>
            <Text style={[{ fontSize: 15, color: colors.textMuted, fontFamily: 'DMSans_500Medium' }]}>Close</Text>
          </TouchableOpacity>
          <Text style={[st.headerTitle, { color: colors.text, fontFamily: 'Outfit_700Bold' }]}>Help & FAQ</Text>
          <View style={st.headerSide} />
        </View>

        <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
          <View style={[st.card, { backgroundColor: colors.cardGlass, borderColor: colors.cardGlassBorder }]}>
            {FAQ_ITEMS.map((item, i) => (
              <View key={i}>
                <FAQItem
                  question={item.q}
                  answer={item.a}
                  expanded={expandedIndex === i}
                  onToggle={() => toggle(i)}
                />
                {i < FAQ_ITEMS.length - 1 && (
                  <View style={[st.divider, { backgroundColor: colors.cardGlassBorder }]} />
                )}
              </View>
            ))}
          </View>

          <Text style={[st.footer, { color: colors.textDim, fontFamily: 'DMSans_400Regular' }]}>
            CampusPlate v2.0 · Built for Hokies, by Hokies
          </Text>
        </ScrollView>

      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerSide: { width: 64 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17 },
  content: { padding: 20, paddingBottom: 48 },
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  questionText: { fontSize: 14, lineHeight: 20 },
  chevron: { fontSize: 14 },
  answerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  answerText: { fontSize: 13, lineHeight: 20 },
  divider: { height: 1, marginHorizontal: 16 },
  footer: { textAlign: 'center', fontSize: 12, opacity: 0.4, marginTop: 24 },
});
