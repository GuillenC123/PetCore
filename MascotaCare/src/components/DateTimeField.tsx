import { useAppColors, useAppearance } from '@/context/AppearanceContext';
import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatearSelector, valorSelector, type DateTimeFieldProps } from '@/utils/fecha-selector';

export default function DateTimeField({ mode, value, onChange, label, error, disabled }: DateTimeFieldProps) {
  const AppColors = useAppColors();
  const { scheme } = useAppearance();


  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState(new Date());
  const abrir = () => { const fecha = valorSelector(value, mode); fecha.setSeconds(0, 0); setBorrador(fecha); setAbierto(true); };
  const selector = <DateTimePicker value={borrador} mode={mode} display={Platform.OS === 'ios' ? 'spinner' : 'default'}
    is24Hour locale="es-PE" themeVariant={scheme} onChange={(event, fecha) => {
      if (Platform.OS === 'android') {
        setAbierto(false);
        if (event.type === 'set' && fecha) onChange(formatearSelector(fecha, mode));
      } else if (fecha) setBorrador(fecha);
    }} />;
  return <View style={{ gap: 6 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value || 'Sin seleccionar'}`} disabled={disabled}
      onPress={abrir} style={{ minHeight: 48, padding: 14, borderWidth: 1, borderColor: error ? AppColors.danger : AppColors.textMuted, borderRadius: 12, backgroundColor: AppColors.surface }}>
      <Text style={{ color: AppColors.text, fontSize: 16 }}>{value || (mode === 'date' ? 'Seleccionar fecha' : 'Seleccionar hora')}</Text>
    </Pressable>
    {!!value && <Pressable accessibilityRole="button" accessibilityLabel={`Borrar ${label.toLowerCase()}`} disabled={disabled} onPress={() => onChange('')} style={{ padding: 12 }}><Text style={{ color: AppColors.accent }}>Borrar selección</Text></Pressable>}
    {abierto && Platform.OS === 'android' && selector}
    <Modal visible={abierto && Platform.OS === 'ios'} transparent animationType="slide" onRequestClose={() => setAbierto(false)}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#0008' }}>
        <View style={{ backgroundColor: AppColors.surface, padding: 20, borderRadius: 16 }}>
          <Text style={{ color: AppColors.text, fontSize: 18 }}>{label}</Text>
          {selector}
          <Pressable accessibilityRole="button" onPress={() => { onChange(formatearSelector(borrador, mode)); setAbierto(false); }} style={{ padding: 16 }}><Text style={{ color: AppColors.accent }}>Confirmar</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => setAbierto(false)} style={{ padding: 16 }}><Text style={{ color: AppColors.accent }}>Cancelar</Text></Pressable>
        </View>
      </View>
    </Modal>
    {!!error && <Text accessibilityRole="alert" style={{ color: AppColors.danger }}>{error}</Text>}
  </View>;
}
