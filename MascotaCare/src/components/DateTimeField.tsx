import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatearSelector, valorSelector, type DateTimeFieldProps } from '@/utils/fecha-selector';

export default function DateTimeField({ mode, value, onChange, label, error, disabled }: DateTimeFieldProps) {
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState(new Date());
  const abrir = () => { const fecha = valorSelector(value, mode); fecha.setSeconds(0, 0); setBorrador(fecha); setAbierto(true); };
  const selector = <DateTimePicker value={borrador} mode={mode} display={Platform.OS === 'ios' ? 'spinner' : 'default'}
    is24Hour locale="es-PE" themeVariant="light" onChange={(event, fecha) => {
      if (Platform.OS === 'android') {
        setAbierto(false);
        if (event.type === 'set' && fecha) onChange(formatearSelector(fecha, mode));
      } else if (fecha) setBorrador(fecha);
    }} />;
  return <View style={{ gap: 6 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value || 'Sin seleccionar'}`} disabled={disabled}
      onPress={abrir} style={{ minHeight: 48, padding: 14, borderWidth: 1, borderColor: error ? '#B91C1C' : '#94A3B8', borderRadius: 12, backgroundColor: '#FFFFFF' }}>
      <Text style={{ color: '#111827', fontSize: 16 }}>{value || (mode === 'date' ? 'Seleccionar fecha' : 'Seleccionar hora')}</Text>
    </Pressable>
    {!!value && <Pressable accessibilityRole="button" accessibilityLabel={`Borrar ${label.toLowerCase()}`} disabled={disabled} onPress={() => onChange('')} style={{ padding: 12 }}><Text style={{ color: '#0369A1' }}>Borrar selección</Text></Pressable>}
    {abierto && Platform.OS === 'android' && selector}
    <Modal visible={abierto && Platform.OS === 'ios'} transparent animationType="slide" onRequestClose={() => setAbierto(false)}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#0008' }}>
        <View style={{ backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16 }}>
          <Text style={{ color: '#111827', fontSize: 18 }}>{label}</Text>
          {selector}
          <Pressable accessibilityRole="button" onPress={() => { onChange(formatearSelector(borrador, mode)); setAbierto(false); }} style={{ padding: 16 }}><Text style={{ color: '#0369A1' }}>Confirmar</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => setAbierto(false)} style={{ padding: 16 }}><Text style={{ color: '#0369A1' }}>Cancelar</Text></Pressable>
        </View>
      </View>
    </Modal>
    {!!error && <Text accessibilityRole="alert" style={{ color: '#B91C1C' }}>{error}</Text>}
  </View>;
}
