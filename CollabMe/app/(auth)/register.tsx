import { Link } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing, typography } from '@/theme';
import {
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordConfirm,
} from '@/utils/validation';

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

export default function RegisterScreen() {
  const { register, loading } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleRegister() {
    const nextErrors: FieldErrors = {
      name: validateName(name) ?? undefined,
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
      confirm: validatePasswordConfirm(password, confirm) ?? undefined,
    };

    const hasError = Object.values(nextErrors).some(Boolean);
    if (hasError) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setFormError(null);
    try {
      await register({ name, email, password });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <Logo />
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>
          Join CollabMe and start matching with people near you.
        </Text>
      </View>

      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        error={errors.name}
        placeholder="Your name"
        autoCapitalize="words"
        textContentType="name"
      />

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />

      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        placeholder="At least 8 characters"
        secure
        autoCapitalize="none"
        textContentType="newPassword"
      />

      <TextField
        label="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        error={errors.confirm}
        placeholder="Re-enter your password"
        secure
        autoCapitalize="none"
        textContentType="newPassword"
      />

      {!!formError && <Text style={styles.formError}>{formError}</Text>}

      <Button label="Sign Up" onPress={handleRegister} loading={loading} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <Link href="/(auth)/login" style={styles.footerLink}>
          Log in
        </Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.lg, marginBottom: spacing.lg },
  title: { ...typography.title, color: colors.text, marginTop: spacing.lg },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  formError: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  footerText: { ...typography.body, color: colors.textMuted },
  footerLink: { ...typography.body, color: colors.primary, fontWeight: '700' },
});
