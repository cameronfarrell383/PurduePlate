import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Restyle primitives
import { Box, Text } from '@/src/theme/restyleTheme';

// Sprint 5 components
import SpiralRings from '@/src/components/SpiralRings';
import MacroLegend from '@/src/components/MacroLegend';
import DashboardStatsRow from '@/src/components/DashboardStatsRow';
import WaterTracker from '@/src/components/WaterTracker';
import ForYouSection, { ForYouSubSection } from '@/src/components/ForYouSection';
import MealLogSection from '@/src/components/MealLogSection';
import StaggeredList from '@/src/components/StaggeredList';
import Confetti from '@/src/components/Confetti';
import GoalHitBanner from '@/src/components/GoalHitBanner';
import Skeleton from '@/src/components/Skeleton';

// Data utilities
import { requireUserId } from '@/src/utils/auth';
import { supabase } from '@/src/utils/supabase';
import { getStreakData, StreakData } from '@/src/utils/streaks';
import { calculateDailyScore } from '@/src/utils/dailyScore';
import { logBelongsToMealGroup, getCurrentMealPeriod, getEffectiveMenuDate } from '@/src/utils/meals';
import { getTodayWater, addWater, getWaterGoal } from '@/src/utils/water';
import { getAllHallStatuses } from '@/src/utils/hours';
import { triggerHaptic } from '@/src/utils/haptics';
import {
  getFavoritesToday,
  getFitsYourMacros,
  getTopRatedHalls,
  getTrySomethingNew,
  getQuickAndLight,
  RecommendedItem,
  TopRatedHallItem,
} from '@/src/utils/recommendations';
import { FavoriteMenuItem } from '@/src/utils/favorites';
import HistoryScreen from './history';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getLocalDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface NutritionData {
  calories: number;
  protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
}

interface MealLog {
  id: string;
  servings: number;
  meal: string;
  created_at?: string;
  menu_items: {
    id?: number;
    name: string;
    station?: string;
    nutrition: NutritionData | NutritionData[] | null;
  } | null;
}

interface Profile {
  name: string;
  goal_calories: number;
  goal_protein_g: number;
  goal_carbs_g: number;
  goal_fat_g: number;
}

interface OpenHall {
  id: number;
  name: string;
  currentMeal: string;
  closingTime: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [forYouFavs, setForYouFavs] = useState<FavoriteMenuItem[]>([]);
  const [forYouMacros, setForYouMacros] = useState<RecommendedItem[]>([]);
  const [forYouTopHalls, setForYouTopHalls] = useState<TopRatedHallItem[]>([]);
  const [forYouNew, setForYouNew] = useState<RecommendedItem[]>([]);
  const [forYouLight, setForYouLight] = useState<RecommendedItem[]>([]);
  const [hallNames, setHallNames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [waterOz, setWaterOz] = useState<number>(0);
  const [waterGoal, setWaterGoal] = useState<number>(64);
  const [openHalls, setOpenHalls] = useState<OpenHall[]>([]);
  const [forYouLoading, setForYouLoading] = useState(true);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // ─── Celebration state ───
  const [showConfetti, setShowConfetti] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');
  const [bannerColor, setBannerColor] = useState<string | undefined>(undefined);

  // ─── Celebration refs ───
  const calorieGoalCelebrated = useRef(false);
  const waterGoalCelebrated = useRef(false);
  const lastCelebratedMilestone = useRef(0);
  const currentDateRef = useRef(getLocalDate());

  // Key to force SpiralRings remount on refresh (re-triggers fill animation)
  const [ringsKey, setRingsKey] = useState(0);

  // Track previous log count to detect new meal logs (for success haptic)
  const prevLogCount = useRef(0);

  useEffect(() => {
    AsyncStorage.getItem('lastStreakMilestone').then((val) => {
      if (val) lastCelebratedMilestone.current = parseInt(val, 10) || 0;
    });
  }, []);

  // ─── Data loading (preserved from Sprint 4) ───

  const loadOpenHalls = async (): Promise<OpenHall[]> => {
    try {
      const today = getLocalDate();
      const { count: hoursCount } = await supabase
        .from('dining_hall_hours')
        .select('id', { count: 'exact', head: true })
        .eq('date', today);

      let statusDate = new Date();
      if (!hoursCount || hoursCount === 0) {
        statusDate = new Date();
        statusDate.setDate(statusDate.getDate() - 1);
      }

      const [statuses, hallsRes] = await Promise.all([
        getAllHallStatuses(statusDate),
        supabase.from('dining_halls').select('id, name').order('name'),
      ]);

      if (hallsRes.error || !hallsRes.data) return [];

      const names: Record<number, string> = {};
      for (const h of hallsRes.data) {
        names[h.id] = h.name;
      }

      const open: OpenHall[] = [];
      for (const [idStr, status] of Object.entries(statuses)) {
        if (status.isOpen) {
          open.push({
            id: Number(idStr),
            name: names[Number(idStr)] || 'Unknown',
            currentMeal: status.currentMeal || '',
            closingTime: status.closingTime || '',
          });
        }
      }
      return open;
    } catch {
      return [];
    }
  };

  const loadForYou = async (userId: string, today: string): Promise<void> => {
    setForYouLoading(true);
    const mealPeriod = getCurrentMealPeriod();
    try {
      const [favs, macros, topHalls, newItems, lightItems, hallsRes] = await Promise.all([
        getFavoritesToday(userId, today).catch(() => [] as FavoriteMenuItem[]),
        getFitsYourMacros(userId, today, mealPeriod).catch(() => [] as RecommendedItem[]),
        getTopRatedHalls().catch(() => [] as TopRatedHallItem[]),
        getTrySomethingNew(userId, today).catch(() => [] as RecommendedItem[]),
        getQuickAndLight(today).catch(() => [] as RecommendedItem[]),
        supabase.from('dining_halls').select('id, name'),
      ]);

      const names: Record<number, string> = {};
      for (const h of hallsRes.data ?? []) {
        names[h.id] = h.name;
      }
      setHallNames(names);
      setForYouFavs(favs);
      setForYouMacros(macros);
      setForYouTopHalls(topHalls);
      setForYouNew(newItems);
      setForYouLight(lightItems);
    } catch {
      // Non-critical — For You sections just won't show
    } finally {
      setForYouLoading(false);
    }
  };

  const loadData = useCallback(async () => {
    try {
      const userId = await requireUserId();
      const today = getLocalDate();
      const menuDate = await getEffectiveMenuDate();

      const [profileRes, logsRes, , waterCount, waterGoalRes, hallStatusMap, streakResult] = await Promise.all([
        supabase.from('profiles').select('name, goal_calories, goal_protein_g, goal_carbs_g, goal_fat_g').eq('id', userId).single(),
        supabase
          .from('meal_logs')
          .select('id, servings, meal, created_at, menu_items(id, name, station, nutrition(calories, protein_g, total_carbs_g, total_fat_g))')
          .eq('user_id', userId)
          .eq('date', today)
          .order('created_at', { ascending: true }),
        loadForYou(userId, menuDate),
        getTodayWater(userId),
        getWaterGoal(userId),
        loadOpenHalls(),
        getStreakData(userId),
      ]);

      if (profileRes.data) setProfile(profileRes.data as any);
      if (logsRes.data) setLogs(logsRes.data as any);
      setWaterOz(waterCount);
      setWaterGoal(waterGoalRes);
      if (hallStatusMap) setOpenHalls(hallStatusMap);
      if (streakResult) setStreakData(streakResult);

      // Reset celebration refs on date change
      if (today !== currentDateRef.current) {
        calorieGoalCelebrated.current = false;
        waterGoalCelebrated.current = false;
        currentDateRef.current = today;
      }

      // Streak milestone celebration
      if (streakResult) {
        const MILESTONES = [7, 14, 30, 60, 100];
        if (MILESTONES.includes(streakResult.currentStreak) && streakResult.currentStreak > lastCelebratedMilestone.current) {
          setShowConfetti(true);
          setBannerMessage(`${streakResult.currentStreak}-day streak! Amazing!`);
          setBannerColor(undefined);
          setBannerVisible(true);
          lastCelebratedMilestone.current = streakResult.currentStreak;
          AsyncStorage.setItem('lastStreakMilestone', String(streakResult.currentStreak));
        }
      }
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // ─── Meal logging success animation ───
  // Fires haptic + celebration when new logs detected (returning from Browse)
  useEffect(() => {
    if (loading || logs.length === 0) return;

    // Detect new meal log (count increased)
    if (logs.length > prevLogCount.current && prevLogCount.current > 0) {
      // Haptic success on new meal logged
      triggerHaptic('success');

      // Check each macro goal for celebration
      if (profile) {
        const goal = profile.goal_calories || 2000;
        if (totalCal >= goal && !calorieGoalCelebrated.current) {
          calorieGoalCelebrated.current = true;
          setShowConfetti(true);
          setBannerMessage('Daily calorie goal reached!');
          setBannerColor(undefined);
          setBannerVisible(true);
        }
      }
    } else if (prevLogCount.current === 0 && profile) {
      // First load — check calorie goal without haptic
      const goal = profile.goal_calories || 2000;
      if (totalCal >= goal && !calorieGoalCelebrated.current) {
        calorieGoalCelebrated.current = true;
        setShowConfetti(true);
        setBannerMessage('Daily calorie goal reached!');
        setBannerColor(undefined);
        setBannerVisible(true);
        triggerHaptic('success');
      }
    }

    prevLogCount.current = logs.length;
  }, [logs]);

  const onRefresh = async () => {
    setRefreshing(true);
    setRingsKey((k) => k + 1);
    await loadData();
    setRefreshing(false);
  };

  const deleteLog = async (logId: string) => {
    try {
      const userId = await requireUserId();
      const { error } = await supabase.from('meal_logs').delete().eq('id', logId).eq('user_id', userId);
      if (error) { console.error('Delete failed:', error.message); Alert.alert('Error', 'Failed to delete. Please try again.'); return; }
      setLogs((prev) => prev.filter((l) => l.id !== logId));
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  const handleAddWater = async (oz: number) => {
    try {
      const userId = await requireUserId();
      const newTotal = await addWater(userId, oz);
      setWaterOz(newTotal);
      if (newTotal >= waterGoal && !waterGoalCelebrated.current) {
        waterGoalCelebrated.current = true;
        setBannerMessage('Hydration goal hit!');
        setBannerColor('#4A7FC5');
        setBannerVisible(true);
      }
    } catch (error) {
      console.error('Failed to add water:', error);
    }
  };

  // ─── Computed values ───

  const getNutrition = (log: MealLog) => {
    const raw = log.menu_items?.nutrition;
    const n = Array.isArray(raw) ? raw[0] : raw;
    const cal = n?.calories || 0;
    const pro = n?.protein_g || 0;
    const carb = n?.total_carbs_g || 0;
    const fat = n?.total_fat_g || 0;
    const s = log.servings || 1;
    return { cal: Math.round(cal * s), pro: Math.round(pro * s), carb: Math.round(carb * s), fat: Math.round(fat * s) };
  };

  const totalCal = logs.reduce((sum, l) => sum + getNutrition(l).cal, 0);
  const totalPro = logs.reduce((sum, l) => sum + getNutrition(l).pro, 0);
  const totalCarb = logs.reduce((sum, l) => sum + getNutrition(l).carb, 0);
  const totalFat = logs.reduce((sum, l) => sum + getNutrition(l).fat, 0);

  const goalCal = profile?.goal_calories || 2000;
  const goalPro = profile?.goal_protein_g || 150;
  const goalCarb = profile?.goal_carbs_g || 200;
  const goalFat = profile?.goal_fat_g || 65;

  const dailyScore = calculateDailyScore(
    { calories: totalCal, protein: totalPro, carbs: totalCarb, fat: totalFat },
    { calories: goalCal, protein: goalPro, carbs: goalCarb, fat: goalFat },
    logs.length,
    waterOz,
    waterGoal
  );

  // ─── Build ForYou sections ───

  const forYouSections: ForYouSubSection[] = [
    {
      title: 'Your Favorites Today',
      iconName: 'heart',
      items: forYouFavs.map((f) => ({
        id: f.id,
        name: f.name,
        calories: f.nutrition?.calories ?? 0,
        hallName: hallNames[f.dining_hall_id] ?? '',
      })),
      filter: 'favorites',
    },
    {
      title: 'Fits Your Macros',
      iconName: 'target',
      items: forYouMacros.map((i) => ({
        id: i.id,
        name: i.name,
        calories: i.calories,
        hallName: i.hall_name,
      })),
      filter: 'macros',
    },
    {
      title: 'Try Something New',
      iconName: 'zap',
      items: forYouNew.map((i) => ({
        id: i.id,
        name: i.name,
        calories: i.calories,
        hallName: i.hall_name,
      })),
      filter: 'new',
    },
    {
      title: 'Quick & Light',
      iconName: 'feather',
      items: forYouLight.map((i) => ({
        id: i.id,
        name: i.name,
        calories: i.calories,
        hallName: i.hall_name,
      })),
      filter: 'light',
    },
  ];

  // ─── Loading skeleton ───

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
        <Box padding="m" paddingBottom="xxl">
          <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="m">
            <Box>
              <Skeleton width={100} height={14} borderRadius={7} />
              <Skeleton width={160} height={28} borderRadius={8} style={{ marginTop: 6 }} />
            </Box>
            <Skeleton width={40} height={40} borderRadius={9999} />
          </Box>
          <Box alignItems="center" marginBottom="m">
            <Skeleton width={280} height={280} borderRadius={140} />
          </Box>
          <Box flexDirection="row" justifyContent="space-between" marginBottom="s">
            <Skeleton width={70} height={12} borderRadius={6} />
            <Skeleton width={70} height={12} borderRadius={6} />
            <Skeleton width={70} height={12} borderRadius={6} />
            <Skeleton width={70} height={12} borderRadius={6} />
          </Box>
          <Box marginTop="l">
            <Skeleton width={120} height={12} borderRadius={6} />
            <Skeleton width={'100%' as any} height={44} borderRadius={8} style={{ marginTop: 12 }} />
            <Skeleton width={'100%' as any} height={44} borderRadius={8} style={{ marginTop: 8 }} />
          </Box>
        </Box>
      </SafeAreaView>
    );
  }

  // ─── Main render ───

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <Confetti visible={showConfetti} onComplete={() => setShowConfetti(false)} />
      <GoalHitBanner
        visible={bannerVisible}
        message={bannerMessage}
        color={bannerColor}
        onDismiss={() => setBannerVisible(false)}
      />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#861F41" />
        }
      >
        {/* 1. Greeting + Avatar row */}
        <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="m">
          <Box>
            <Text variant="muted">{getGreeting()}</Text>
            <Text variant="pageTitle">{profile?.name || 'there'}</Text>
          </Box>
          <Box
            width={40}
            height={40}
            borderRadius="full"
            alignItems="center"
            justifyContent="center"
            style={{ backgroundColor: '#861F41' }}
          >
            <Text variant="body" style={{ color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 16 }}>
              {profile?.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </Box>
        </Box>

        {/* 2. SpiralRings hero (has its own animation — NOT in StaggeredList) */}
        <Box alignItems="center" marginBottom="m">
          <SpiralRings
            key={ringsKey}
            calories={{ current: totalCal, goal: goalCal }}
            protein={{ current: totalPro, goal: goalPro }}
            carbs={{ current: totalCarb, goal: goalCarb }}
            fat={{ current: totalFat, goal: goalFat }}
          />
        </Box>

        {/* StaggeredList wraps MacroLegend downward */}
        <StaggeredList staggerDelay={50} initialDelay={200}>
          {/* 3. MacroLegend */}
          <Box marginBottom="m">
            <MacroLegend
              calories={{ current: totalCal, goal: goalCal }}
              protein={{ current: totalPro, goal: goalPro }}
              carbs={{ current: totalCarb, goal: goalCarb }}
              fat={{ current: totalFat, goal: goalFat }}
            />
          </Box>

          {/* 4. DashboardStatsRow */}
          <Box marginBottom="m">
            <DashboardStatsRow
              streak={streakData?.currentStreak ?? 0}
              score={dailyScore.score}
              grade={dailyScore.grade}
            />
          </Box>

          {/* 5. WaterTracker */}
          <Box marginBottom="m">
            <WaterTracker
              waterOz={waterOz}
              waterGoal={waterGoal}
              onAddWater={handleAddWater}
            />
          </Box>

          {/* 6. ForYouSection */}
          <Box marginBottom="m">
            {forYouLoading ? (
              <Box>
                <Text variant="cardTitle" marginBottom="m">For You</Text>
                {[0, 1, 2].map((rowIdx) => (
                  <Box key={rowIdx} marginBottom="m">
                    <Skeleton width={130} height={15} borderRadius={7} style={{ marginBottom: 10 }} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {[0, 1, 2].map((i) => (
                        <Box
                          key={i}
                          width={140}
                          padding="m"
                          borderRadius="m"
                          backgroundColor="card"
                          borderColor="border"
                          borderWidth={1}
                          marginRight="s"
                        >
                          <Skeleton width={100} height={13} borderRadius={6} />
                          <Skeleton width={60} height={12} borderRadius={6} style={{ marginTop: 6 }} />
                          <Skeleton width={80} height={11} borderRadius={6} style={{ marginTop: 4 }} />
                        </Box>
                      ))}
                    </ScrollView>
                  </Box>
                ))}
              </Box>
            ) : (
              <ForYouSection
                sections={forYouSections}
                onSeeAll={(filter) => router.push({ pathname: '/(tabs)/browse', params: { filter } })}
                onItemPress={() => router.push('/(tabs)/browse')}
              />
            )}
          </Box>

          {/* 7. MealLogSection */}
          <Box marginBottom="xxl">
            <MealLogSection
              logs={logs}
              onHistoryPress={() => setShowHistory(true)}
              onDeleteLog={deleteLog}
              logBelongsToMealGroup={logBelongsToMealGroup}
            />
          </Box>
        </StaggeredList>
      </ScrollView>

      {/* History Modal */}
      <Modal
        visible={showHistory}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHistory(false)}
      >
        <Box flex={1} backgroundColor="background">
          <Box flexDirection="row" justifyContent="flex-end" paddingHorizontal="m" paddingTop="m" paddingBottom="s">
            <Text variant="body" color="textMuted" onPress={() => setShowHistory(false)}>Close</Text>
          </Box>
          <HistoryScreen />
        </Box>
      </Modal>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OLD SPRINT 4 DASHBOARD CODE — COMMENTED OUT (DO NOT DELETE)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Removed imports:
//   import { Animated, Easing, StyleSheet, Text as RNText, TouchableOpacity, View } from 'react-native';
//   import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
//   import * as Haptics from 'expo-haptics';
//   import { useTheme } from '@/src/context/ThemeContext';
//   import DailyScoreCard from '@/src/components/DailyScoreCard';
//   import { Feather } from '@expo/vector-icons';
//   import { useStaggerAnimation } from '@/src/hooks/useStaggerAnimation';
//
// Removed: BouncingEmoji component, useStaggerAnimation hook, RN Animated ring
// animation refs (calRingAnim, proRingAnim, carbRingAnim, fatRingAnim),
// ring SVG math (ringSize, ringStroke, ringGap, radii, circumferences,
// animated strokeDashoffsets), renderMealGroup(), renderForYouSkeletonRow(),
// renderForYouItemRow(), AnimatedCircleComponent.
//
// Old render return JSX and StyleSheet preserved below for reference:
//
/*
  return (
    <SafeAreaView style={[st.safe, { backgroundColor: colors.background }]}>
      <Confetti visible={showConfetti} onComplete={() => setShowConfetti(false)} />
      <GoalHitBanner visible={bannerVisible} message={bannerMessage} color={bannerColor} onDismiss={() => setBannerVisible(false)} />
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.maroon} />}>
        <Animated.View style={[st.header, { opacity: entryAnims[0], transform: [{ translateY: entryAnims[0].interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] }]}>
          <View>
            <Text style={[st.greetingLabel, { color: colors.textMuted, fontFamily: 'DMSans_400Regular' }]}>{getGreeting()}</Text>
            <Text style={[st.greeting, { color: colors.text, fontFamily: 'Outfit_700Bold' }]}>{profile?.name || 'there'}</Text>
          </View>
          <View style={[st.gradePill, { backgroundColor: dailyScore.gradeColor + '26' }]}>
            <Text style={[st.gradePillText, { color: dailyScore.gradeColor, fontFamily: 'DMSans_700Bold' }]}>{dailyScore.grade}</Text>
          </View>
        </Animated.View>
        <Animated.View style={[st.ringWrap, { opacity: entryAnims[1], transform: [{ scale: entryAnims[1].interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }]}>
          <Svg width={ringSize} height={ringSize}>...</Svg>
          <View style={st.ringCenter}>
            <Text style={[st.ringNumber, { color: colors.text, fontFamily: 'Outfit_800ExtraBold' }]}>{totalCal.toLocaleString()}</Text>
            <Text style={[st.ringLabel, { color: colors.textMuted, fontFamily: 'DMSans_400Regular' }]}>of {goalCal.toLocaleString()} cal</Text>
          </View>
        </Animated.View>
        ...full old render continues with legendRow, streakScoreRow, waterCard, openHalls, forYou, meals, historyModal...
      </ScrollView>
    </SafeAreaView>
  );

  const st = StyleSheet.create({
    safe: { flex: 1 },
    scroll: { padding: 20, paddingBottom: 100 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    greetingLabel: { fontSize: 14, marginBottom: 2 },
    greeting: { fontSize: 28 },
    gradePill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    gradePillText: { fontSize: 14 },
    ringWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    ringCenter: { position: 'absolute', alignItems: 'center' },
    ringNumber: { fontSize: 36 },
    ringLabel: { fontSize: 13, marginTop: 2 },
    legendRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 12, fontFamily: 'DMSans_500Medium' },
    waterCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 16 },
    waterLabel: { fontSize: 14 },
    waterBarTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden', marginHorizontal: 12 },
    waterBarFill: { height: 4, borderRadius: 2 },
    waterAmount: { fontSize: 14, marginRight: 8 },
    waterPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, marginLeft: 4 },
    waterPillText: { fontSize: 12 },
    sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 20 },
    forYouSubtitle: { fontSize: 15, marginBottom: 10 },
    forYouCard: { width: 140, padding: 12, borderRadius: 14, marginRight: 10 },
    forYouName: { fontSize: 13, fontFamily: 'DMSans_600SemiBold', marginTop: 8 },
    forYouDetail: { fontSize: 12, fontFamily: 'DMSans_400Regular', marginTop: 2 },
    forYouHall: { fontSize: 11, fontFamily: 'DMSans_400Regular', marginTop: 2 },
    forYouBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginTop: 6, alignSelf: 'flex-start' },
    openHallCard: { width: 140, padding: 12, borderRadius: 14, marginRight: 10, borderWidth: 1, alignItems: 'flex-start' },
    mealHeader: { fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },
    logRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    logName: { flex: 1, fontSize: 15 },
    logCal: { fontSize: 14, marginRight: 8 },
    deleteBtn: { padding: 4 },
    divider: { height: 1 },
    historyModalHeader: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    streakScoreRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
    streakCard: { flex: 1, borderRadius: 14, padding: 16, borderWidth: 1, overflow: 'hidden' },
    streakCardHeader: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: 'DMSans_500Medium' },
    streakCardNumber: { fontSize: 32, marginTop: 6 },
    streakCardLabel: { fontSize: 13, marginTop: 2 },
    streakCardAccent: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2 },
    forYouEmptyCard: { borderRadius: 14, borderWidth: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  });
*/
