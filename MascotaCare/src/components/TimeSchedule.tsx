import { useAppColors } from '@/context/AppearanceContext';
import { Pressable, Text, View } from 'react-native';
import DateTimeField from './DateTimeField';

export default function TimeSchedule({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const AppColors = useAppColors();


  const horarios = value.split(',');
  return <View style={{ gap: 12 }}>
    {horarios.map((hora, i) => <View key={i} style={{ gap: 4 }}>
      <Text style={{ color: AppColors.text }}>Horario {i + 1}</Text>
      <DateTimeField disabled={disabled} mode="time" label={`Horario ${i + 1}`} value={hora.trim()} onChange={(nuevo) => onChange(horarios.map((h, index) => index === i ? nuevo : h).join(','))} />
      {horarios.length > 1 && <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={`Quitar horario ${i + 1}`} onPress={() => onChange(horarios.filter((_, index) => index !== i).join(','))} style={{ padding: 12 }}><Text style={{ color: AppColors.danger }}>Quitar horario</Text></Pressable>}
    </View>)}
    {horarios.length < 24 && <Pressable disabled={disabled} accessibilityRole="button" onPress={() => onChange(`${value},`)} style={{ padding: 14, backgroundColor: AppColors.infoSoft, borderRadius: 12 }}><Text style={{ color: AppColors.accent }}>Añadir otro horario</Text></Pressable>}
  </View>;
}
