import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuthStore } from '../../stores/authStore';
import FormField from '../../components/shared/FormField';
import Button from '../../components/shared/Button';
import { RootStackParamList } from '../../types/navigation';
import { dark, elevation, radius, spacing, typography } from '../../theme';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { register } = useAuthStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+7');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordMismatch =
    password.length > 0 &&
    passwordConfirm.length > 0 &&
    password !== passwordConfirm;

  const canSubmit = useMemo(() => {
    if (
      !firstName ||
      !lastName ||
      !phoneNumber ||
      !password ||
      !passwordConfirm
    ) {
      return false;
    }
    return password === passwordConfirm;
  }, [firstName, lastName, phoneNumber, password, passwordConfirm]);

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        password,
        passwordConfirm,
        role: 'user',
        phoneNumber: phoneNumber.trim(),
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || t('auth.registerFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color={dark.text}
            />
          </TouchableOpacity>

          <Animated.View
            entering={FadeIn.duration(500)}
            style={styles.logoWrap}
          >
            <View style={styles.logoHalo}>
              <View style={styles.logoCore}>
                <MaterialCommunityIcons
                  name="account-plus-outline"
                  size={28}
                  color={dark.textOnTeal}
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(500)}>
            <Text style={styles.brand}>{t('auth.registerTitle')}</Text>
            <Text style={styles.subtitle}>{t('auth.registerSubtitle')}</Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(220).duration(500)}
            style={styles.card}
          >
            <View style={styles.row}>
              <View style={styles.flex1}>
                <FormField
                  icon="account-outline"
                  placeholder={t('auth.firstName')}
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
              <View style={styles.gap} />
              <View style={styles.flex1}>
                <FormField
                  icon="account-outline"
                  placeholder={t('auth.lastName')}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>

            <FormField
              icon="phone-outline"
              placeholder={t('auth.phonePlaceholder')}
              value={phoneNumber}
              onChangeText={(v) => setPhoneNumber(v || '+7')}
              keyboardType="phone-pad"
              hint={t('auth.phoneHint')}
            />

            <FormField
              icon="email-outline"
              placeholder={t('auth.emailOptional')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              hint={t('auth.emailOptionalHint')}
            />

            <FormField
              icon="lock-outline"
              placeholder={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              hint={t('auth.passwordHint')}
            />

            <FormField
              icon="lock-check-outline"
              placeholder={t('auth.confirmPassword')}
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              secureTextEntry
              errorText={
                passwordMismatch ? t('auth.passwordMismatch') : undefined
              }
            />

            {error ? (
              <Animated.View entering={FadeIn.duration(200)}>
                <Text style={styles.error}>{error}</Text>
              </Animated.View>
            ) : null}

            <Button
              label={t('auth.register')}
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={!canSubmit}
              fullWidth
              size="lg"
              style={styles.submit}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(320).duration(500)}>
            <Text
              style={styles.link}
              onPress={() => navigation.navigate('Login')}
            >
              {t('auth.hasAccount')}{' '}
              <Text style={styles.linkAccent}>{t('auth.signIn')}</Text>
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.bg },
  flex: { flex: 1 },
  flex1: { flex: 1 },
  gap: { width: spacing.sm },
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoHalo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: dark.tealMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: dark.tealBorder,
  },
  logoCore: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: dark.teal,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.md,
  },
  brand: {
    ...typography.heading,
    color: dark.text,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: dark.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: dark.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: dark.border,
    ...elevation.sm,
  },
  row: {
    flexDirection: 'row',
  },
  submit: {
    marginTop: spacing.sm,
  },
  error: {
    ...typography.caption,
    color: dark.dangerText,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  link: {
    marginTop: spacing.lg,
    textAlign: 'center',
    ...typography.body,
    color: dark.textSecondary,
  },
  linkAccent: {
    color: dark.teal,
    fontWeight: '700',
  },
});
