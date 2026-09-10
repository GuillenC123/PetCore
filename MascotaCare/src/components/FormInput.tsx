// ============================================================================
// FormInput.tsx - Campo de texto del formulario de autenticación
// ----------------------------------------------------------------------------
// Input con estilo "moderno": fondo blanco, borde, esquinas redondeadas, un
// pequeño ícono a la izquierda y soporte para mostrar/ocultar contraseña.
// Acepta invalidación (borde rojo) y mensaje de error.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { useId, useState } from 'react';
import {
  StyleSheet,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { AppColors } from '@/constants/theme';
import DateTimeField from './DateTimeField';

interface FormInputProps extends TextInputProps {
  dateMode?: 'date' | 'time';
  label?: string;
  /** Ícono a mostrar a la izquierda del campo. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Si es true, se muestra un botón para ocultar/mostrar el texto. */
  secure?: boolean;
  /** Mensaje de error (resalta el borde en rojo si existe). */
  error?: string;
}

export default function FormInput({
  icon,
  secure,
  error,
  label,
  dateMode,
  ...inputProps
}: FormInputProps) {
  const [oculto, setOculto] = useState(true);
  const labelId = useId();
  // Si es un campo de contraseña, lo alternamos entre visible/oculto.
  const muestraTexto = secure ? !oculto : true;

  if (dateMode) return <DateTimeField mode={dateMode} value={inputProps.value ?? ''} onChange={inputProps.onChangeText ?? (() => {})}
    label={label ?? inputProps.accessibilityLabel ?? (dateMode === 'date' ? 'Fecha' : 'Hora')} error={error} disabled={inputProps.editable === false} />;

  return (
    <View style={styles.wrapper}>
      {!!label && <Text nativeID={labelId} style={styles.label}>{label}</Text>}
      <View style={[styles.container, error ? styles.containerError : null]}>
        {/* Ícono opcional a la izquierda. */}
        {icon ? (
          <Ionicons name={icon} size={20} color={AppColors.textSecondary} />
        ) : null}

        {/* Campo de texto. */}
        <TextInput
          placeholderTextColor={AppColors.textSecondary}
          style={styles.input}
          secureTextEntry={!muestraTexto}
          accessibilityLabel={label ?? inputProps.placeholder}
          accessibilityLabelledBy={label ? labelId : undefined}
          {...inputProps}
        />

        {/* Botón mostrar/ocultar contraseña. */}
        {secure ? (
          <Pressable accessibilityRole="button" accessibilityLabel={oculto ? 'Mostrar contraseña' : 'Ocultar contraseña'}
            onPress={() => setOculto(!oculto)} style={styles.visibility}>
          <Ionicons
            name={oculto ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={AppColors.textSecondary}
          />
          </Pressable>
        ) : null}
      </View>

      {/* Mensaje de error bajo el campo. */}
      {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 15, fontWeight: '600', color: AppColors.text },
  visibility: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  wrapper: {
    gap: 4,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: AppColors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
  },
  containerError: {
    borderColor: AppColors.danger,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: AppColors.text,
  },
  errorText: {
    fontSize: 12,
    color: AppColors.danger,
  },
});
