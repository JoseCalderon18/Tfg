import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useThemeColors } from '../hooks/useThemeColors';
import { borderRadius, spacing, typography } from '../theme';

const SECTIONS = [
  {
    id: 'features',
    title: 'Funciones principales',
    items: [
      {
        name: 'GPS y seguimiento',
        description:
          'La app envía tu posición al panel de mando mientras la jornada está activa. El supervisor puede verte en tiempo real en el mapa.',
      },
      {
        name: 'Alertas y SOS',
        description:
          'Pulsa el botón ALERTA para notificar una incidencia. Mantén pulsado SOS 4 segundos para enviar una emergencia crítica inmediata.',
      },
      {
        name: 'Jornadas',
        description:
          'Inicia tu jornada desde el menú (☰ → Iniciar jornada). Puedes pausar con un descanso y finalizar cuando termines el turno.',
      },
      {
        name: 'Puntos de interés',
        description:
          'Crea marcadores geolocalizados en el mapa para señalar recursos, peligros u objetivos. Quedan visibles para el supervisor.',
      },
      {
        name: 'Chat operativo',
        description:
          'Comunícate con el supervisor desde el menú → Chat. Los mensajes son en tiempo real y quedan registrados.',
      },
      {
        name: 'Modo sin conexión',
        description:
          'Si pierdes cobertura, las alertas y acciones se guardan en cola. Al recuperar la red se sincronizan automáticamente.',
      },
    ],
  },
  {
    id: 'faq',
    title: 'Preguntas frecuentes',
    items: [
      {
        name: '¿Cómo activo el GPS?',
        description:
          'Al iniciar la app o la jornada se te pedirá permiso de ubicación. Acéptalo. Si no, ve a Ajustes del dispositivo → Aplicaciones → esta app → Permisos → Ubicación.',
      },
      {
        name: '¿Qué pasa si salgo del área de trabajo?',
        description:
          'El sistema genera una alerta GEOFENCE y la pantalla se bloquea indicando que estás fuera del área. El supervisor puede desbloquearte o debes volver al área asignada.',
      },
      {
        name: '¿Puedo usar la app sin internet?',
        description:
          'Sí. Las alertas y puntos de interés se guardan en cola offline y se envían cuando recuperas la conexión. La jornada también se registra localmente.',
      },
      {
        name: '¿Cómo cancelo un SOS accidental?',
        description:
          'Durante los 4 segundos de cuenta atrás, suelta el botón antes de que termine. Si ya se envió, contacta con el supervisor para que lo cierre desde el panel web.',
      },
      {
        name: '¿Cómo cambio la contraseña?',
        description:
          'Ve al menú (☰) → Configuracion → Resetear contraseña. También puedes hacerlo desde la pantalla de login con la opción "Olvidé mi contraseña".',
      },
    ],
  },
  {
    id: 'tutorials',
    title: 'Tutoriales rápidos',
    items: [
      {
        name: 'Iniciar una jornada',
        description:
          '1. Abre el menú (☰).\n2. Pulsa "Iniciar jornada".\n3. Añade notas opcionales.\n4. Confirma. El supervisor verá tu jornada activa.',
      },
      {
        name: 'Enviar alerta SOS',
        description:
          '1. En la pantalla principal, localiza el botón rojo SOS.\n2. Mantenlo pulsado 4 segundos.\n3. La barra de progreso llega al final y se envía.\n4. Suelta antes para cancelar.',
      },
      {
        name: 'Crear un punto de interés',
        description:
          '1. Pulsa "Puntos de interés" en la pantalla principal.\n2. Elige la ubicación en el mapa o usa la actual.\n3. Añade nombre y descripción.\n4. Guarda. Quedará visible en el panel web.',
      },
      {
        name: 'Ver compañeros en el mapa',
        description:
          '1. Abre el menú (☰).\n2. Pulsa "Companeros".\n3. Verás la posición GPS de los operativos activos en el mismo incidente.',
      },
    ],
  },
];

export default function HelpScreen({ navigation }: any) {
  const themeColors = useThemeColors();
  const [openSections, setOpenSections] = useState<string[]>(['features']);

  const toggleSection = (id: string) => {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView
        style={[styles.screen, { backgroundColor: themeColors.background }]}
        contentContainerStyle={styles.content}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: themeColors.surfaceMuted }]}
          activeOpacity={0.85}
        >
          <Text style={[styles.backButtonText, { color: themeColors.text }]}>Volver</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: themeColors.textMuted }]}>DOCUMENTACIÓN</Text>
          <Text style={[styles.title, { color: themeColors.text }]}>Ayuda y tutoriales</Text>
          <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>
            Guía de uso de la app operativa de emergencias.
          </Text>
        </View>

        {SECTIONS.map((section) => {
          const isOpen = openSections.includes(section.id);
          return (
            <View
              key={section.id}
              style={[styles.sectionCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
            >
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(section.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{section.title}</Text>
                <Text style={[styles.chevron, { color: themeColors.textMuted }]}>{isOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isOpen
                ? section.items.map((item, index) => (
                    <View
                      key={index}
                      style={[
                        styles.item,
                        { borderTopColor: themeColors.border },
                        index === 0 && { borderTopWidth: 1 },
                      ]}
                    >
                      <View style={[styles.itemDot, { backgroundColor: themeColors.primary }]} />
                      <View style={styles.itemBody}>
                        <Text style={[styles.itemName, { color: themeColors.text }]}>{item.name}</Text>
                        <Text style={[styles.itemDescription, { color: themeColors.textMuted }]}>
                          {item.description}
                        </Text>
                      </View>
                    </View>
                  ))
                : null}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  backButton: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backButtonText: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
  },
  header: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
  },
  title: {
    ...typography.heading2,
    marginTop: spacing.xs,
  },
  subtitle: {
    ...typography.body2,
    marginTop: spacing.xs,
  },
  sectionCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.subtitle.fontSize,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    marginTop: 6,
    flexShrink: 0,
  },
  itemBody: {
    flex: 1,
  },
  itemName: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
  },
  itemDescription: {
    fontSize: typography.body2.fontSize,
    lineHeight: typography.body2.lineHeight,
    marginTop: 2,
  },
});
