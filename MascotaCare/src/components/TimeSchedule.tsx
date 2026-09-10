import { Pressable, Text, View } from 'react-native';
import DateTimeField from './DateTimeField';

export default function TimeSchedule({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const horarios = value.split(',');
  return <View style={{ gap: 12 }}>
    {horarios.map((hora, i) => <View key={i} style={{ gap: 4 }}>
      <Text style={{ color: '#111827' }}>Horario {i + 1}</Text>
      <DateTimeField mode="time" label={`Horario ${i + 1}`} value={hora.trim()} onChange={(nuevo) => onChange(horarios.map((h, index) => index === i ? nuevo : h).join(','))} />
      {horarios.length > 1 && <Pressable accessibilityRole="button" accessibilityLabel={`Quitar horario ${i + 1}`} onPress={() => onChange(horarios.filter((_, index) => index !== i).join(','))} style={{ padding: 12 }}><Text style={{ color: '#B91C1C' }}>Quitar horario</Text></Pressable>}
    </View>)}
    {horarios.length < 24 && <Pressable accessibilityRole="button" onPress={() => onChange(`${value},`)} style={{ padding: 14, backgroundColor: '#E0F2FE', borderRadius: 12 }}><Text style={{ color: '#0369A1' }}>Añadir otro horario</Text></Pressable>}
  </View>;
}
