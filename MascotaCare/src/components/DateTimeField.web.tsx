import { useAppColors, useAppearance } from '@/context/AppearanceContext';
import { desdeWeb, valorWeb, type DateTimeFieldProps } from '@/utils/fecha-selector';

export default function DateTimeField({ mode, value, onChange, label, error, disabled }: DateTimeFieldProps) {
  const AppColors = useAppColors();
  const { scheme } = useAppearance();


  return <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <input type={mode} aria-label={label} aria-invalid={!!error} disabled={disabled} value={valorWeb(value, mode)}
      step={mode === 'time' ? 60 : undefined} onChange={(event) => onChange(desdeWeb(event.target.value, mode))}
      style={{ boxSizing: 'border-box', width: '100%', minWidth: 0, minHeight: 48, padding: 12, border: `1px solid ${error ? AppColors.danger : AppColors.textMuted}`, borderRadius: 12, background: AppColors.surface, color: AppColors.text, font: 'inherit', fontSize: 16, colorScheme: scheme }} />
    {!!value && <button type="button" disabled={disabled} aria-label={`Borrar ${label.toLowerCase()}`} onClick={() => onChange('')}
      style={{ alignSelf: 'flex-start', padding: 12, border: 0, background: 'transparent', color: AppColors.accent, cursor: 'pointer' }}>Borrar selección</button>}
    {!!error && <span role="alert" style={{ color: AppColors.danger }}>{error}</span>}
  </div>;
}
