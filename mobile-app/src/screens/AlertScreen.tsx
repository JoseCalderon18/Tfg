import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, SafeAreaView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../context/OfflineSyncContext';
import { sendSosAlert as enviarAlertaSos } from '../services/sos';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

const TIPOS_ALERTA = [
  { etiqueta: 'SOS Emergencia', valor: 'SOS' },
  { etiqueta: 'Operativo caido', valor: 'MAN_DOWN' },
  { etiqueta: 'Operativo perdido/desorientado', valor: 'LOST' },
  { etiqueta: 'Fuera de zona segura', valor: 'GEOFENCE' },
  { etiqueta: 'Anomalia detectada', valor: 'ANOMALY' },
  { etiqueta: 'Cambio de fuego', valor: 'FIRE_SPREAD' },
  { etiqueta: 'Humo en incidente', valor: 'SMOKE' },
  { etiqueta: 'Operativo herido', valor: 'INJURY' },
  { etiqueta: 'Operativo fallecido', valor: 'DEATH' },
  { etiqueta: 'Evacuacion', valor: 'EVACUATION' },
  { etiqueta: 'Emergencia medica', valor: 'MEDICAL' },
  { etiqueta: 'Operativo atrapado', valor: 'TRAPPED' },
  { etiqueta: 'Incidente vehicular', valor: 'VEHICLE' },
  { etiqueta: 'Animal peligroso', valor: 'ANIMAL' },
  { etiqueta: 'Animal herido', valor: 'ANIMAL_INJURY' },
  { etiqueta: 'Recursos bajos', valor: 'LOW_SUPPLIES' },
  { etiqueta: 'Perdida de comunicacion', valor: 'COMM_LOSS' },
  { etiqueta: 'Peligro ambiental', valor: 'HAZARD' },
  { etiqueta: 'Fatiga extrema', valor: 'FATIGUE' },
  { etiqueta: 'Clima peligroso', valor: 'WEATHER' },
  { etiqueta: 'Bateria baja', valor: 'BATTERY' },
  { etiqueta: 'Inmovilidad prolongada', valor: 'MOVEMENT' },
  { etiqueta: 'Otro', valor: 'OTHER' },
];

function obtenerEtiquetaTipoAlerta(valor: string) {
  return TIPOS_ALERTA.find((tipoAlerta) => tipoAlerta.valor === valor)?.etiqueta ?? valor;
}

function esErrorTipoAlertaInvalido(error?: string) {
  return Boolean(error && error.toLowerCase().includes('alert_type') && error.toLowerCase().includes('valid choice'));
}

export default function PantallaAlerta({ navigation, route }: any) {
  const [tipoAlerta, setTipoAlerta] = useState('SOS');
  const [severidad, setSeveridad] = useState(3);
  const [descripcion, setDescripcion] = useState('');
  const [campoEnfocado, setCampoEnfocado] = useState<string | null>(null);
  const { location: ubicacion } = useLocation();
  const { token } = useAuth();
  const { queueAlert: encolarAlerta } = useOfflineSync();
  const idIncidente = route?.params?.incidentId as string | undefined;
  const nombreIncidente = route?.params?.incidentName as string | undefined;

  const enviarAlerta = async () => {
    try {
      if (!token) {
        Alert.alert('Error', 'No hay sesion activa.');
        return;
      }

      if (!ubicacion) {
        Alert.alert('Error', 'Activa el GPS antes de enviar una alerta.');
        return;
      }

      let resultado =
        tipoAlerta === 'SOS'
          ? await enviarAlertaSos({
              queueAlert: encolarAlerta,
              latitude: ubicacion.coords.latitude,
              longitude: ubicacion.coords.longitude,
              severity: severidad,
              title: 'SOS operativo',
              description: descripcion || 'SOS enviado desde el formulario de alerta.',
              incidentId: idIncidente,
            })
          : await encolarAlerta({
              incident: idIncidente ?? null,
              alert_type: tipoAlerta,
              severity: severidad,
              title: obtenerEtiquetaTipoAlerta(tipoAlerta),
              description: descripcion,
              lat: ubicacion.coords.latitude,
              lng: ubicacion.coords.longitude,
            });

      if (!resultado.ok && tipoAlerta !== 'SOS' && esErrorTipoAlertaInvalido(resultado.error)) {
        const etiquetaTipoSeleccionado = obtenerEtiquetaTipoAlerta(tipoAlerta);
        const descripcionAlternativa = [
          `Tipo solicitado: ${etiquetaTipoSeleccionado} (${tipoAlerta}).`,
          descripcion,
        ].filter(Boolean).join('\n\n');

        resultado = await encolarAlerta({
          incident: idIncidente ?? null,
          alert_type: 'OTHER',
          severity: severidad,
          title: etiquetaTipoSeleccionado,
          description: descripcionAlternativa,
          lat: ubicacion.coords.latitude,
          lng: ubicacion.coords.longitude,
        });
      }

      if (!resultado.ok) {
        throw new Error(resultado.error ?? 'No se pudo registrar la alerta.');
      }

      Alert.alert(
        resultado.queued ? 'Alerta en cola' : 'Alerta enviada',
        resultado.queued
          ? 'La alerta se guardo sin conexion y se enviara automaticamente cuando vuelva la red.'
          : 'La alerta se envio correctamente.'
      );
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo enviar la alerta.');
    }
  };

  return (
    <SafeAreaView style={estilos.areaSegura}>
      <ScrollView style={estilos.contenedor} showsVerticalScrollIndicator={false}>
        <View style={estilos.cabecera}>
          <Text style={estilos.titulo}>Enviar alerta</Text>
          <Text style={estilos.subtitulo}>
            {nombreIncidente ? `Asociada a ${nombreIncidente}` : 'Documenta la situacion de emergencia'}
          </Text>
        </View>

        <View style={estilos.seccionFormulario}>
          <Text style={estilos.etiqueta}>Tipo de alerta</Text>
          <View style={estilos.contenedorSelector}>
            <Picker
              selectedValue={tipoAlerta}
              onValueChange={setTipoAlerta}
              style={estilos.selector}
            >
              {TIPOS_ALERTA.map((tipo) => (
                <Picker.Item key={tipo.valor} label={tipo.etiqueta} value={tipo.valor} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={estilos.seccionFormulario}>
          <Text style={estilos.etiqueta}>Nivel de alerta</Text>
          <View style={estilos.indicadorSeveridad}>
            {[1, 2, 3, 4, 5].map((nivel) => (
              <TouchableOpacity
                key={nivel}
                style={[
                  estilos.insigniaSeveridad,
                  severidad === nivel && estilos.insigniaSeveridadActiva,
                ]}
                onPress={() => setSeveridad(nivel)}
              >
                <Text style={[
                  estilos.etiquetaSeveridad,
                  severidad === nivel && estilos.etiquetaSeveridadActiva,
                ]}>
                  {nivel}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={estilos.etiquetasSeveridad}>
            <Text style={estilos.textoSeveridad}>Critico</Text>
            <Text style={estilos.textoSeveridad}>Informacion</Text>
          </View>
        </View>

        <View style={estilos.seccionFormulario}>
          <Text style={estilos.etiqueta}>Descripcion</Text>
          <TextInput
            style={[
              estilos.areaTexto,
              campoEnfocado === 'descripcion' && estilos.campoEnfocado,
            ]}
            placeholder="Describe la situacion..."
            placeholderTextColor={colors.textMuted}
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            numberOfLines={5}
            onFocus={() => setCampoEnfocado('descripcion')}
            onBlur={() => setCampoEnfocado(null)}
          />
        </View>

        <TouchableOpacity
          style={estilos.botonEnviar}
          onPress={enviarAlerta}
          activeOpacity={0.85}
        >
          <Text style={estilos.textoBotonEnviar}>Enviar alerta ahora</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    padding: 20,
    backgroundColor: colors.background,
  },
  areaSegura: {
    flex: 1,
    backgroundColor: colors.background,
  },
  cabecera: {
    marginBottom: spacing.xxxl,
    paddingTop: spacing.md,
  },
  titulo: {
    ...typography.heading2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitulo: {
    ...typography.body,
    color: colors.textMuted,
  },
  seccionFormulario: {
    marginBottom: spacing.xxl,
  },
  etiqueta: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.md,
  },
  contenedorSelector: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  selector: {
    color: colors.text,
  },
  areaTexto: {
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
  campoEnfocado: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  indicadorSeveridad: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  insigniaSeveridad: {
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
  insigniaSeveridadActiva: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  etiquetaSeveridad: {
    ...typography.subtitle,
    color: colors.text,
  },
  etiquetaSeveridadActiva: {
    color: colors.white,
  },
  etiquetasSeveridad: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textoSeveridad: {
    ...typography.label,
    color: colors.textMuted,
  },
  botonEnviar: {
    backgroundColor: colors.danger,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
    marginVertical: spacing.xxxl,
    ...shadows.lg,
  },
  textoBotonEnviar: {
    color: colors.white,
    ...typography.subtitle,
  },
  boton: {
    backgroundColor: colors.danger,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  entrada: {
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
