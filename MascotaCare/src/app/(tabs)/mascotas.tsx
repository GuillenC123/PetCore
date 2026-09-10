import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '@/components/AppHeader';
import HealthRecord from '@/components/HealthRecord';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function FichaSaludScreen() {
  const { mascotas } = useAuth();
  const [seleccionada, setSeleccionada] = useState<number | null>(null);
  const mascota = mascotas.find((m) => m.id === seleccionada) ?? mascotas[0];
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppHeader onPressBell={() => router.push('/recordatorios')} />
          <Text style={styles.title}>Ficha de salud</Text>
          <Text style={styles.description}>Elige una mascota y abre la sección que quieras consultar.</Text>
          {mascota ? <>
            <Text style={styles.label}>Selecciona una mascota</Text>
            <ScrollView horizontal contentContainerStyle={styles.options}>
              {mascotas.map((m) => <Pressable key={m.id} accessibilityRole="radio" accessibilityState={{ checked: m.id === mascota.id }}
                onPress={() => setSeleccionada(m.id)} style={[styles.option, m.id === mascota.id && styles.active]}>
                <Text style={styles.label}>{m.nombre}</Text>
              </Pressable>)}
            </ScrollView>
            <HealthRecord key={mascota.id} mascota={mascota} />
          </> : <View style={styles.empty}>
            <Text style={styles.label}>Registra tu primera mascota</Text>
            <Text style={styles.description}>Podrás completar su ficha de salud después de añadirla.</Text>
            <Pressable accessibilityRole="button" style={styles.option} onPress={() => router.push('/nueva-mascota')}>
              <Text style={styles.label}>Añadir mascota</Text>
            </Pressable>
          </View>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  content: { padding: 20, paddingBottom: 40, gap: 16, width: '100%', maxWidth: 800, alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: AppColors.text },
  description: { fontSize: 14, lineHeight: 21, color: AppColors.textSecondary },
  label: { fontSize: 15, fontWeight: '600', color: AppColors.text },
  options: { flexDirection: 'row', gap: 10 },
  option: { borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: AppColors.surface },
  active: { backgroundColor: AppColors.infoSoft, borderColor: '#0369A1' },
  empty: { gap: 12 },
});
