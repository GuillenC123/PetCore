import { useAppColors } from '@/context/AppearanceContext';
import { Text, View } from 'react-native';
import type { Mascota } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useAhora } from '@/hooks/use-ahora';
import { estadosSalud } from '@/utils/estados-salud';
import Badge from './Badge';

export default function PetHealthStatus({ mascota, compact = false }: { mascota: Mascota; compact?: boolean }) {
  const AppColors = useAppColors();


  const { tratamientos } = useAuth();
  const ahora = useAhora();
  const estados = estadosSalud(mascota, tratamientos, ahora);
  return <View style={[{ gap: 6 }, compact && { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }]}>
    {!compact && <Text style={{ color: AppColors.textSecondary, fontSize: 12 }}>Salud</Text>}
    <Badge label={estados.salud} tone={estados.salud === 'Malestar' ? 'danger' : estados.salud === 'Saludable' ? 'success' : 'neutral'} />
    {(estados.enTratamiento || estados.vacunaPendiente || estados.desparasitacionPendiente) && <>
      {!compact && <Text style={{ color: AppColors.textSecondary, fontSize: 12 }}>Cuidados</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, flexShrink: 1 }}>
        {estados.enTratamiento && <Badge label="En tratamiento" tone="info" />}
        {estados.vacunaPendiente && <Badge label={estados.vacunaVencida ? 'Vacuna pendiente · vencida' : 'Vacuna pendiente'} tone={estados.vacunaVencida ? 'danger' : 'info'} />}
        {estados.desparasitacionPendiente && <Badge label="Desparasitación pendiente" tone="info" />}
      </View>
    </>}
  </View>;
}
