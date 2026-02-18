import { Text, View } from '@/components/Themed';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
// Using the two-dot path to reach your src/utils folder
import { calculateDailyGoal } from '../../src/utils/nutrition';
import { supabase } from '../../src/utils/supabase';

export default function ProfileScreen() {
  const [weight, setWeight] = useState('');
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');
  const [age, setAge] = useState('');

  const handleSave = async () => {
    const totalInches = (Number(feet) * 12) + Number(inches);
    const heightCm = totalInches * 2.54;
    const dailyCalories = calculateDailyGoal(Number(weight), heightCm, Number(age), true, 'maintain');
    
    const { error } = await supabase
      .from('profiles')
      .insert([{ weight: Number(weight), height: heightCm, goal_calories: dailyCalories }]);

    if (error) alert(error.message);
    else alert(`Saved! Your daily goal is ${dailyCalories} calories.`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>CampusPlate Profile</Text>
      
      <Text style={styles.label}>Weight (lbs)</Text>
      <TextInput placeholder="e.g. 180" placeholderTextColor="#999" style={styles.input} onChangeText={setWeight} keyboardType="numeric" />

      <Text style={styles.label}>Height</Text>
      <View style={styles.row}>
        <TextInput placeholder="Feet" placeholderTextColor="#999" style={[styles.input, { flex: 1, marginRight: 10 }]} onChangeText={setFeet} keyboardType="numeric" />
        <TextInput placeholder="Inches" placeholderTextColor="#999" style={[styles.input, { flex: 1 }]} onChangeText={setInches} keyboardType="numeric" />
      </View>

      <Text style={styles.label}>Age</Text>
      <TextInput placeholder="e.g. 20" placeholderTextColor="#999" style={styles.input} onChangeText={setAge} keyboardType="numeric" />

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Calculate & Save Goal</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#000' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#fff' },
  label: { alignSelf: 'flex-start', color: '#fff', marginBottom: 5, fontWeight: '600' },
  row: { flexDirection: 'row', width: '100%', backgroundColor: 'transparent' },
  input: { width: '100%', borderWidth: 1, borderColor: '#444', padding: 15, marginBottom: 15, color: '#fff', borderRadius: 8, backgroundColor: '#111' },
  button: { backgroundColor: '#8B1E3F', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});