import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiFetch, parseJsonResponse } from '../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

type Step = 'request' | 'verify' | 'confirm' | 'done';

export default function ResetPasswordScreen({ navigation }: any) {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmitRequest = useMemo(() => email.trim().length > 0, [email]);
  const canSubmitVerify = useMemo(() => email.trim().length > 0 && code.trim().length === 6, [email, code]);
  const canSubmitConfirm = useMemo(
    () => email.trim().length > 0 && resetToken && newPassword.trim().length >= 8 && newPassword === confirmPassword,
    [email, resetToken, newPassword, confirmPassword]
  );

  const showError = (nextError: unknown) => {
    if (nextError instanceof Error) {
      setError(nextError.message);
      return;
    }

    setError(String(nextError ?? 'Ocurrió un error.')); 
  };

  const handleRequestReset = async () => {
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const response = await apiFetch('/auth/password-reset/request/', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const payload = await parseJsonResponse<any>(response);

      if (!response.ok) {
        const errorMessage = payload.email?.[0] ?? payload.detail ?? payload.error ?? 'No se pudo enviar la solicitud.';
        throw new Error(errorMessage);
      }

      const nextResetToken = payload.reset_token ?? payload.reset_token_debug ?? '';
      if (nextResetToken) {
        setResetToken(nextResetToken);
        setMessage(
          'La solicitud de restablecimiento se ha aceptado. Introduce tu nueva contraseña para completar el cambio.'
        );
        setStep('confirm');
      } else {
        setMessage('Se ha enviado un código de verificación a tu correo. Revisa tu bandeja de entrada.');
        setStep('verify');
      }
    } catch (nextError) {
      showError(nextError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const response = await apiFetch('/auth/password-reset/verify-code/', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
      });
      const payload = await parseJsonResponse<any>(response);

      if (!response.ok) {
        const errorMessage = payload.code?.[0] ?? payload.detail ?? payload.error ?? 'Código inválido.';
        throw new Error(errorMessage);
      }

      setResetToken(payload.reset_token ?? '');
      if (!payload.reset_token) {
        throw new Error('No se recibió el token de restauración.');
      }

      setMessage('Código verificado. Ahora puedes crear una nueva contraseña.');
      setStep('confirm');
    } catch (nextError) {
      showError(nextError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const response = await apiFetch('/auth/password-reset/confirm/', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          reset_token: resetToken,
          new_password: newPassword,
        }),
      });
      const payload = await parseJsonResponse<any>(response);

      if (!response.ok) {
        const errorMessage = payload.new_password?.[0] ?? payload.detail ?? payload.error ?? 'No se pudo actualizar la contraseña.';
        throw new Error(errorMessage);
      }

      setMessage('Contraseña actualizada correctamente. Puedes iniciar sesión con tu nueva contraseña.');
      setStep('done');
    } catch (nextError) {
      showError(nextError);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepTitle = () => {
    switch (step) {
      case 'request':
        return 'Restablecer contraseña';
      case 'verify':
        return 'Verificar código';
      case 'confirm':
        return 'Crear nueva contraseña';
      case 'done':
        return '¡Listo!';
      default:
        return 'Restablecer contraseña';
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>{renderStepTitle()}</Text>
          <Text style={styles.subtitle}>
            {step === 'request' && 'Introduce tu correo electrónico para recibir un código de verificación.'}
            {step === 'verify' && 'Introduce el código que recibiste por correo.'}
            {step === 'confirm' && 'Escribe tu nueva contraseña y confírmala.'}
            {step === 'done' && 'Tu contraseña se ha actualizado correctamente.'}
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {message ? <Text style={styles.successText}>{message}</Text> : null}

        {(step === 'request' || step === 'verify' || step === 'confirm') && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </>
        )}

        {step === 'verify' && (
          <TextInput
            style={styles.input}
            placeholder="Código de 6 dígitos"
            placeholderTextColor={colors.textMuted}
            value={code}
            onChangeText={setCode}
            keyboardType="numeric"
            maxLength={6}
          />
        )}

        {step === 'confirm' && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Nueva contraseña"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirmar contraseña"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </>
        )}

        {step === 'done' ? (
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.buttonText}>Volver a iniciar sesión</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, submitting ? styles.buttonDisabled : null]}
            onPress={
              step === 'request'
                ? handleRequestReset
                : step === 'verify'
                ? handleVerifyCode
                : handleConfirmPassword
            }
            disabled={submitting || (step === 'request' ? !canSubmitRequest : step === 'verify' ? !canSubmitVerify : !canSubmitConfirm)}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>
                {step === 'request' ? 'Enviar código' : step === 'verify' ? 'Verificar código' : 'Actualizar contraseña'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.backLink}
          onPress={() => navigation.navigate('Login')}
          disabled={submitting}
        >
          <Text style={styles.backLinkText}>Volver a inicio de sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xxl,
    justifyContent: 'center',
    flexGrow: 1,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.heading2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 22,
  },
  input: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    ...typography.body,
    ...shadows.sm,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    marginTop: spacing.sm,
    ...shadows.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    ...typography.subtitle,
  },
  backLink: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  backLinkText: {
    color: colors.primary,
    ...typography.body,
    fontWeight: '700',
  },
  errorText: {
    color: colors.danger,
    marginBottom: spacing.md,
    ...typography.small,
  },
  successText: {
    color: colors.success,
    marginBottom: spacing.md,
    ...typography.small,
  },
});
