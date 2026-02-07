import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuthStore } from '../../stores/authStore';
import { colors, spacing, typography } from '../../theme';
import { RootStackParamList } from '../../types/navigation';

const passwordRule = 'At least 8 chars, upper, lower, number, special.';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { register } = useAuthStore();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'supervisor' | 'driver'>('supervisor');
  const [companyId, setCompanyId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const driverFieldsRequired = role === 'driver';

  const canSubmit = useMemo(() => {
    if (!username || !email || !password || !passwordConfirm) return false;
    if (password !== passwordConfirm) return false;
    if (driverFieldsRequired) {
      return Boolean(companyId && phoneNumber && vehiclePlate);
    }
    return true;
  }, [username, email, password, passwordConfirm, driverFieldsRequired, companyId, phoneNumber, vehiclePlate]);

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
        passwordConfirm,
        role,
        company: companyId.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        vehiclePlate: vehiclePlate.trim() || undefined,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('auth.register')}</Text>
        <TextInput
          placeholder={t('auth.username')}
          style={styles.input}
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder={t('auth.email')}
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
        <View style={styles.roleRow}>
          <Text style={styles.roleLabel}>{t('auth.role')}</Text>
          <View style={styles.roleButtons}>
            <TouchableOpacity
              style={role === 'supervisor' ? styles.roleButtonActive : styles.roleButton}
              onPress={() => setRole('supervisor')}
            >
              <Text style={role === 'supervisor' ? styles.roleTextActive : styles.roleText}>Supervisor</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={role === 'driver' ? styles.roleButtonActive : styles.roleButton}
              onPress={() => setRole('driver')}
            >
              <Text style={role === 'driver' ? styles.roleTextActive : styles.roleText}>Driver</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TextInput
          placeholder={t('auth.companyId')}
          style={styles.input}
          value={companyId}
          onChangeText={setCompanyId}
        />
        {driverFieldsRequired ? (
          <>
            <TextInput
              placeholder={t('auth.phoneNumber')}
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
            <TextInput
              placeholder={t('auth.vehiclePlate')}
              style={styles.input}
              value={vehiclePlate}
              onChangeText={setVehiclePlate}
            />
          </>
        ) : null}
        <TextInput
          placeholder={t('auth.password')}
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Text style={styles.helper}>{passwordRule}</Text>
        <TextInput
          placeholder={t('auth.confirmPassword')}
          style={styles.input}
          secureTextEntry
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.buttonText}>{t('auth.register')}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>{t('auth.login')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.xl,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    color: colors.textPrimary,
  },
  helper: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: -spacing.md,
    marginBottom: spacing.md,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.surface,
    fontWeight: '600',
    fontSize: 16,
  },
  linkButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  linkText: {
    color: colors.primary,
    fontWeight: '600',
  },
  roleRow: {
    marginBottom: spacing.lg,
  },
  roleLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  roleButtons: {
    flexDirection: 'row',
  },
  roleButton: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginRight: spacing.sm,
  },
  roleButtonActive: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginRight: spacing.sm,
  },
  roleText: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  roleTextActive: {
    fontSize: 12,
    color: colors.surface,
    fontWeight: '600',
  },
});
