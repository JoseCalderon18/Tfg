import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { apiFetch, parseJsonResponse } from '../services/api';
import { borderRadius, colors, shadows, spacing, typography } from '../theme';

const ENDPOINT_SOLICITAR_CODIGO = '/auth/password-reset/request/';
const ENDPOINT_VERIFICAR_CODIGO = '/auth/password-reset/verify-code/';
const ENDPOINT_CONFIRMAR_PASSWORD = '/auth/password-reset/confirm/';

function obtenerMensajeError(data: unknown, mensajePorDefecto: string) {
  if (!data || typeof data !== 'object') {
    return mensajePorDefecto;
  }

  const posibleDetalle = (data as Record<string, unknown>).detail;
  if (typeof posibleDetalle === 'string' && posibleDetalle.trim()) {
    return posibleDetalle;
  }

  const primeraClave = Object.keys(data)[0];
  if (!primeraClave) {
    return mensajePorDefecto;
  }

  const valor = (data as Record<string, unknown>)[primeraClave];
  if (Array.isArray(valor) && typeof valor[0] === 'string') {
    return `${primeraClave}: ${valor[0]}`;
  }
  if (typeof valor === 'string') {
    return `${primeraClave}: ${valor}`;
  }

  return mensajePorDefecto;
}

export default function ResetPasswordScreen({ navigation }: any) {
  const [correoElectronico, setCorreoElectronico] = useState('');
  const [codigoVerificacion, setCodigoVerificacion] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmacionPassword, setConfirmacionPassword] = useState('');
  const [tokenReseteoVerificado, setTokenReseteoVerificado] = useState('');

  const [modalNuevaPasswordAbierto, setModalNuevaPasswordAbierto] = useState(false);
  const [requiereCodigo, setRequiereCodigo] = useState(false);

  const [enviandoCodigo, setEnviandoCodigo] = useState(false);
  const [reseteandoPassword, setReseteandoPassword] = useState(false);

  const [errorPagina, setErrorPagina] = useState('');
  const [errorNuevaPassword, setErrorNuevaPassword] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  const correoNormalizado = useMemo(() => correoElectronico.trim().toLowerCase(), [correoElectronico]);
  const puedeContinuar = correoNormalizado.length > 0 && !enviandoCodigo;

  function volverAlLogin() {
    if (navigation.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Login');
  }

  function cerrarModal() {
    setModalNuevaPasswordAbierto(false);
    setErrorNuevaPassword('');
    setCodigoVerificacion('');
    setNuevaPassword('');
    setConfirmacionPassword('');
  }

  async function continuarAlCambioPassword() {
    setErrorPagina('');
    setMensajeExito('');

    if (!correoNormalizado) {
      setErrorPagina('Introduce un correo electronico valido.');
      return;
    }

    setEnviandoCodigo(true);

    try {
      const respuesta = await apiFetch(ENDPOINT_SOLICITAR_CODIGO, {
        method: 'POST',
        body: JSON.stringify({ email: correoNormalizado }),
      });
      const data = await parseJsonResponse<{ reset_token_debug?: string; detail?: string } | Record<string, unknown>>(respuesta);

      if (!respuesta.ok) {
        setErrorPagina(obtenerMensajeError(data, 'No se pudo preparar el cambio de password.'));
        return;
      }

      const tokenDebug = typeof data.reset_token_debug === 'string' ? data.reset_token_debug : '';
      setTokenReseteoVerificado(tokenDebug);
      setRequiereCodigo(!tokenDebug);
      setCodigoVerificacion('');
      setNuevaPassword('');
      setConfirmacionPassword('');
      setErrorNuevaPassword('');
      setModalNuevaPasswordAbierto(true);
      setMensajeExito(
        typeof data.detail === 'string' ? data.detail : 'Continua con el cambio de password.'
      );
    } catch {
      setErrorPagina('No se pudo conectar con el servidor.');
    } finally {
      setEnviandoCodigo(false);
    }
  }

  async function verificarCodigoSiHaceFalta() {
    if (!requiereCodigo) {
      return tokenReseteoVerificado;
    }

    if (!codigoVerificacion.trim()) {
      throw new Error('Introduce el codigo de verificacion.');
    }

    const respuesta = await apiFetch(ENDPOINT_VERIFICAR_CODIGO, {
      method: 'POST',
      body: JSON.stringify({
        email: correoNormalizado,
        code: codigoVerificacion.trim(),
      }),
    });
    const data = await parseJsonResponse<{ reset_token?: string } | Record<string, unknown>>(respuesta);

    if (!respuesta.ok) {
      throw new Error(obtenerMensajeError(data, 'El codigo no es valido o ha caducado.'));
    }

    const token = typeof data.reset_token === 'string' ? data.reset_token : '';
    if (!token) {
      throw new Error('No se recibio el token de reseteo.');
    }

    setTokenReseteoVerificado(token);
    setRequiereCodigo(false);
    return token;
  }

  async function resetearPassword() {
    setErrorNuevaPassword('');
    setMensajeExito('');

    if (nuevaPassword.length < 8) {
      setErrorNuevaPassword('La nueva password debe tener al menos 8 caracteres.');
      return;
    }

    if (nuevaPassword.includes(' ')) {
      setErrorNuevaPassword('La nueva password no puede contener espacios.');
      return;
    }

    if (nuevaPassword !== confirmacionPassword) {
      setErrorNuevaPassword('La confirmacion de la password no coincide.');
      return;
    }

    setReseteandoPassword(true);

    try {
      const resetToken = await verificarCodigoSiHaceFalta();
      const respuesta = await apiFetch(ENDPOINT_CONFIRMAR_PASSWORD, {
        method: 'POST',
        body: JSON.stringify({
          email: correoNormalizado,
          reset_token: resetToken,
          new_password: nuevaPassword,
        }),
      });
      const data = await parseJsonResponse<Record<string, unknown>>(respuesta);

      if (!respuesta.ok) {
        setErrorNuevaPassword(obtenerMensajeError(data, 'No se pudo actualizar la password.'));
        return;
      }

      setModalNuevaPasswordAbierto(false);
      setMensajeExito('La contrasena se ha actualizado correctamente. Ya puedes iniciar sesion.');
      setTokenReseteoVerificado('');
      setCodigoVerificacion('');
      setNuevaPassword('');
      setConfirmacionPassword('');
      setTimeout(volverAlLogin, 1200);
    } catch (error) {
      setErrorNuevaPassword(error instanceof Error ? error.message : 'No se pudo actualizar la password.');
    } finally {
      setReseteandoPassword(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.shell}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Resetear password</Text>
            <Text style={styles.subtitle}>
              Introduce el correo y continua al cambio de password.
            </Text>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Correo electronico</Text>
            <TextInput
              style={styles.input}
              value={correoElectronico}
              onChangeText={setCorreoElectronico}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              placeholder="usuario@emergency.com"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Coloque la direccion de correo electronico asociada a su cuenta y le enviaremos un codigo de verificacion. Luego podra usar ese codigo para establecer una nueva password.
            </Text>
          </View>

          {errorPagina ? <Text style={styles.errorBox}>{errorPagina}</Text> : null}
          {mensajeExito ? <Text style={styles.successBox}>{mensajeExito}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryButton, !puedeContinuar && styles.buttonDisabled]}
            onPress={continuarAlCambioPassword}
            disabled={!puedeContinuar}
            activeOpacity={0.85}
          >
            {enviandoCodigo ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Continuar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={volverAlLogin} disabled={enviandoCodigo}>
            <Text style={styles.backLinkText}>Ir a iniciar sesion</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={modalNuevaPasswordAbierto}
        transparent
        animationType="fade"
        onRequestClose={cerrarModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Nueva password</Text>
              <Text style={styles.modalSubtitle}>
                Introduce la nueva password y confirmala para completar el cambio.
              </Text>

              {requiereCodigo ? (
                <View style={styles.fieldBlock}>
                  <Text style={styles.label}>Codigo de verificacion</Text>
                  <TextInput
                    style={styles.input}
                    value={codigoVerificacion}
                    onChangeText={setCodigoVerificacion}
                    keyboardType="numeric"
                    maxLength={6}
                    placeholder="Codigo de 6 digitos"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              ) : null}

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Nueva password</Text>
                <TextInput
                  style={styles.input}
                  value={nuevaPassword}
                  onChangeText={setNuevaPassword}
                  secureTextEntry
                  autoComplete="new-password"
                  placeholder="Minimo 8 caracteres"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Confirmar password</Text>
                <TextInput
                  style={styles.input}
                  value={confirmacionPassword}
                  onChangeText={setConfirmacionPassword}
                  secureTextEntry
                  autoComplete="new-password"
                  placeholder="Repite la nueva password"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {errorNuevaPassword ? <Text style={styles.errorBox}>{errorNuevaPassword}</Text> : null}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={cerrarModal}
                  disabled={reseteandoPassword}
                  activeOpacity={0.85}
                >
                  <Text style={styles.secondaryButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryButton, styles.modalPrimaryButton, reseteandoPassword && styles.buttonDisabled]}
                  onPress={resetearPassword}
                  disabled={reseteandoPassword}
                  activeOpacity={0.85}
                >
                  {reseteandoPassword ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Resetear password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.xxl,
    ...shadows.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.heading2,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  fieldBlock: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    color: colors.text,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  infoBox: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  infoText: {
    ...typography.small,
    color: colors.textMuted,
  },
  errorBox: {
    ...typography.small,
    backgroundColor: colors.dangerSoft,
    borderRadius: borderRadius.md,
    color: colors.danger,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  successBox: {
    ...typography.small,
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.md,
    color: colors.success,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    ...typography.subtitle,
    color: colors.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  backLink: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  backLinkText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  modalContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.xxl,
    ...shadows.lg,
  },
  modalTitle: {
    ...typography.heading3,
    color: colors.text,
  },
  modalSubtitle: {
    ...typography.small,
    color: colors.textMuted,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  modalActions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    ...typography.subtitle,
    color: colors.text,
  },
  modalPrimaryButton: {
    marginTop: 0,
  },
});
