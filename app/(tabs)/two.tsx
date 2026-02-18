import { Text, View } from '@/components/Themed';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
// Using the two-dot path to reach your src/utils folder
import { supabase } from '../../src/utils/supabase';

export default function MenuScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('dining_hall_id', 15) // D2 ID from Cameron's notes
      .limit(50);

    if (error) console.error("Supabase Error:", error.message);
    else setItems(data || []);
    setLoading(false);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#8B1E3F" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>D2 Today</Text>
        <TouchableOpacity onPress={fetchMenu}><Text style={styles.refreshText}>Refresh</Text></TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <View style={styles.center}><Text style={styles.errorText}>No food found for D2.</Text></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <View>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemStation}>{item.station || 'General'}</Text>
              </View>
              <Text style={styles.mealTag}>{item.meal}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, backgroundColor: 'transparent' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  refreshText: { color: '#8B1E3F', fontWeight: 'bold' },
  itemCard: { backgroundColor: '#111', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#8B1E3F' },
  itemName: { color: '#fff', fontSize: 16, fontWeight: 'bold', maxWidth: '80%' },
  itemStation: { color: '#999', fontSize: 12, textTransform: 'uppercase', marginTop: 4 },
  mealTag: { color: '#8B1E3F', fontWeight: 'bold', fontSize: 12 },
  errorText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});