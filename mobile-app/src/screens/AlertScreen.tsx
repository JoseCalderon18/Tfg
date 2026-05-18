import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, SafeAreaView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../context/OfflineSyncContext';
import { sendSosAlert as dispatchSosAlert } from '../services/sos';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

const ALERT_TYPES = [
  { label: 'SOS Emergencia', value: 'SOS' },
  { label: 'Operativo caido', value: 'MAN_DOWN' },
  { label: 'Operativo perdido/desorientado', value: 'LOST' },
  { label: 'Fuera de zona segura', value: 'GEOFENCE' },
  { label: 'Anomalia detectada', value: 'ANOMALY' },
  { label: 'Cambio de fuego', value: 'FIRE_SPREAD' },
  { label: 'Humo en incidente', value: 'SMOKE' },
  { label: 'Operativo herido', value: 'INJURY' },
  { label: 'Operativo fallecido', value: 'DEATH' },
  { label: 'Evacuacion', value: 'EVACUATION' },
  { label: 'Emergencia medica', value: 'MEDICAL' },
  { label: 'Operativo atrapado', value: 'TRAPPED' },
  { label: 'Incidente vehicular', value: 'VEHICLE' },
  { label: 'Animal peligroso', value: 'ANIMAL' },
  { label: 'Animal herido', value: 'ANIMAL_INJURY' },
  { label: 'Recursos bajos', value: 'LOW_SUPPLIES' },
  { label: 'Perdida de comunicacion', value: 'COMM_LOSS' },
  { label: 'Peligro ambiental', value: 'HAZARD' },
  { label: 'Fatiga extrema', value: 'FATIGUE' },
  { label: 'Clima peligroso', value: 'WEATHER' },
  { label: 'Bateria baja', value: 'BATTERY' },
  { label: 'Inmovilidad prolongada', value: 'MOVEMENT' },
  { label: 'Otro', value: 'OTHER' },
];

function getAlertTypeLabel(value: string) {
  return ALERT_TYPES.find((alertType) => alertType.value === value)?.label ?? value;
}

function isInvalidAlertTypeError(error?: string) {
  return Boolean(error && error.toLowerCase().includes('alert_type') && error.toLowerCase().includes('valid choice'));
}

export default function AlertScreen({ navigation, route }: any) {
  // Estado del formulario de alertas en campo.
  const [tipoAlerta, setTipoAlerta] = useState('SOS');
  const [severidad, setSeveridad] = useState(3);
  const [descripcion, setDescripcion] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { location } = useLocation();
  const { token } = useAuth();
  const { queueAlert } = useOfflineSync();
  const incidentId = route?.params?.incidentId as string | undefined;
  const incidentName = route?.params?.incidentName as string | undefined;

  const handleSendAlert = async () => {
    try {
      // Validamos sesión y ubicación antes de registrar la alerta operativa.
      if (!token) {
        Alert.alert('Error', 'No hay sesión activa.');
        return;
      }

      if (!location) {
        Alert.alert('Error', 'Activa el GPS antes de enviar una alerta.');
        return;
      }

      let result =
        tipoAlerta === 'SOS'
          ? await dispatchSosAlert({
              queueAlert,
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              severity: severidad,
              title: 'SOS operativo',
              description: descripcion || 'SOS enviado desde el formulario de alerta.',
              incidentId,
            })
          : await queueAlert({
              incident: incidentId ?? null,
              alert_type: tipoAlerta,
              severity: severidad,
              title: getAlertTypeLabel(tipoAlerta),
              description: descripcion,
              lat: location.coords.latitude,
              lng: location.coords.longitude,
            });

      if (!result.ok && tipoAlerta !== 'SOS' && isInvalidAlertTypeError(result.error)) {
        const selectedTypeLabel = getAlertTypeLabel(tipoAlerta);
        const fallbackDescription = [
          `Tipo solicitado: ${selectedTypeLabel} (${tipoAlerta}).`,
          descripcion,
        ].filter(Boolean).join('\n\n');

        result = await queueAlert({
          incident: incidentId ?? null,
          alert_type: 'OTHER',
          severity: severidad,
          title: selectedTypeLabel,
          description: fallbackDescription,
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      }

      if (!result.ok) {
        throw new Error(result.error ?? 'No se pudo registrar la alerta.');
      }

      Alert.alert(
        result.queued ? 'Alerta en cola' : 'Alerta enviada',
        result.queued
          ? 'La alerta se guardo sin conexion y se enviara automaticamente cuando vuelva la red.'
          : 'La alerta se envio correctamente.'
      );
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send alert');
    }
  };

  return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Enviar alerta</Text>
            <Text style={styles.subtitle}>
              {incidentName ? `Asociada a ${incidentName}` : 'Documenta la situacion de emergencia'}
            </Text>
          </View>

          {/* Form Sections */}
          <View style={styles.formSection}>
            <Text style={styles.label}>Tipo de alerta</Text>
            <View style={styles.pickerContainer}>
              <Picker 
                selectedValue={tipoAlerta} 
                onValueChange={setTipoAlerta} 
                style={styles.picker}
              >
                {ALERT_TYPES.map((alertType) => (
                  <Picker.Item key={alertType.value} label={alertType.label} value={alertType.value} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Nivel de alerta</Text>
            <View style={styles.severityIndicator}>
              {[1, 2, 3, 4, 5].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.severityBadge,
                    severidad === level && styles.severityBadgeActive,
                  ]}
                  onPress={() => setSeveridad(level)}
                >
                  <Text style={[
                    styles.severityLabel,
                    severidad === level && styles.severityLabelActive,
                  ]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.severityLabels}>
              <Text style={styles.severityText}>Crítico</Text>
              <Text style={styles.severityText}>Información</Text>
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[
                styles.textArea,
                focusedField === 'description' && styles.inputFocused,
              ]}
              placeholder="Describe la situación..."
              placeholderTextColor={colors.textMuted}
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              numberOfLines={5}
              onFocus={() => setFocusedField('description')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Action Button */}
          <TouchableOpacity 
            style={styles.submitButton} 
            onPress={handleSendAlert}
            activeOpacity={0.85}
          >
            <Text style={styles.submitButtonText}>Enviar alerta ahora</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    marginBottom: spacing.xxxl,
    paddingTop: spacing.md,
  },
  title: {
    ...typography.heading2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
  formSection: {
    marginBottom: spacing.xxl,
  },
  label: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.md,
  },
  pickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  picker: {
    color: colors.text,
  },
  textArea: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: 100,
    textAlignVertical: 'top',
    color: colors.text,
    ...typography.body,
    ...shadows.sm,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  severityIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  severityBadge: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xs,
  },
  severityBadgeActive: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  severityLabel: {
    ...typography.subtitle,
    color: colors.text,
  },
  severityLabelActive: {
    color: colors.white,
  },
  severityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  severityText: {
    ...typography.label,
    color: colors.textMuted,
  },
  submitButton: {
    backgroundColor: colors.danger,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
    marginVertical: spacing.xxxl,
    ...shadows.lg,
  },
  submitButtonText: {
    color: colors.white,
    ...typography.subtitle,
  },
  button: {
    backgroundColor: colors.danger,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  input: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
