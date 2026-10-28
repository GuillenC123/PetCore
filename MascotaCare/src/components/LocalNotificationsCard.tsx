import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useAppColors } from '@/context/AppearanceContext';
import { useLocalNotifications } from '@/context/LocalNotificationsContext';
import { abrirAjustesPermisos } from '@/services/permisos';

export default function LocalNotificationsCard() {
  const colors = useAppColors();
  const { habilitado, listo, ocupado, cantidad, permiso, error, cambiar, actualizar, prueba } = useLocalNotifications();
  const [mensaje, setMensaje] = useState('');
  const button = { minHeight: 44, padding: 12, borderRadius: 10, backgroundColor: colors.infoSoft };
  return <View style={{ padding: 18, borderRadius: 16, gap: 12, backgroundColor: colors.surface }}>
    <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Avisos de cuidados</Text>
    <Text style={{ color: colors.textSecondary, lineHeight: 21 }}>{Platform.OS === 'web'
      ? 'Los avisos del teléfono se activan en Android o iOS. La agenda sigue disponible aquí.'
      : 'Recibe avisos a la hora de tus citas, medicamentos y recordatorios. Los cuidados sin hora avisan a las 09:00.'}</Text>
    {Platform.OS !== 'web' && <>
      <Pressable accessibilityRole="switch" accessibilityLabel="Avisos locales de cuidados" accessibilityState={{ checked: habilitado, disabled: !listo || ocupado }}
        disabled={!listo || ocupado} onPress={() => { setMensaje(''); void cambiar(!habilitado); }} style={button}>
        <Text style={{ color: colors.accent, fontWeight: '700' }}>{!listo ? 'Cargando configuración…' : habilitado ? 'Desactivar avisos' : 'Activar avisos'}</Text>
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={{ color: colors.textSecondary }}>{habilitado && permiso === 'permitido'
        ? `${cantidad} avisos futuros programados en este dispositivo.` : habilitado ? 'Activos en PetCore, pero falta permitir las notificaciones del teléfono.' : 'Avisos desactivados en este dispositivo para tu cuenta.'}</Text>
      {(permiso === 'bloqueado' || (habilitado && permiso !== 'permitido')) && <Pressable accessibilityRole="button" onPress={() => void abrirAjustesPermisos().catch(() => setMensaje('Abre Ajustes del dispositivo y permite las notificaciones de PetCore.'))} style={button}><Text style={{ color: colors.accent }}>Abrir Ajustes de notificaciones</Text></Pressable>}
      {habilitado && permiso === 'permitido' && <Pressable accessibilityRole="button" disabled={ocupado} onPress={() => { setMensaje(''); void prueba().then(() => setMensaje('Prueba solicitada. Si no aparece, revisa los mensajes y los ajustes del dispositivo.')); }} style={button}><Text style={{ color: colors.accent }}>Probar aviso en 5 segundos</Text></Pressable>}
      <Text style={{ color: colors.textSecondary, lineHeight: 20, fontSize: 12 }}>Se programan los próximos 50 avisos y se actualizan al abrir la app. El ahorro de batería puede retrasar la entrega. Las tareas repetidas avanzan cuando las completas.</Text>
    </>}
    {!!error && <><Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void actualizar()} style={button}><Text style={{ color: colors.accent }}>Reintentar avisos</Text></Pressable></>}
    {!!mensaje && <Text accessibilityLiveRegion="polite" style={{ color: colors.textSecondary }}>{mensaje}</Text>}
  </View>;
}
