import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuthStore } from '../../stores/authStore';
import SegmentedControl from '../../components/shared/SegmentedControl';
import FormField from '../../components/shared/FormField';
import Button from '../../components/shared/Button';
import { RootStackParamList } from '../../types/navigation';
import { dark, elevation, radius, spacing, typography } from '../../theme';

export default function LoginScreen() {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { login, startPhoneLogin, verifyPhoneLogin } = useAuthStore();

  const [mode, setMode] = useState<'phone' | 'whatsapp' | 'email'>('phone');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+7');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setError(null);
    setCode('');
    setCodeSent(false);
  }, [mode]);

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === 'email') {
        await login(email.trim(), password);
        return;
      }
      if (!codeSent) {
        await startPhoneLogin(phoneNumber.trim(), mode === 'whatsapp' ? 'whatsapp' : 'sms');
        setCodeSent(true);
        return;
      }
      await verifyPhoneLogin(phoneNumber.trim(), code.trim());
    } catch {
      setError(
        t(mode === 'email' ? 'auth.invalidCredentials' : 'auth.phoneLoginFailed'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const segments = useMemo(
    () => [
      { key: 'phone', label: t('auth.phoneLogin') },
      { key: 'whatsapp', label: t('auth.whatsappLogin') },
      { key: 'email', label: t('auth.emailLogin') },
    ],
    [t],
  );

  const submitLabel =
    mode === 'email'
      ? t('auth.signIn')
      : codeSent
        ? t('auth.verifyCode')
        : mode === 'whatsapp'
          ? t('auth.sendWhatsAppCode')
          : t('auth.sendCode');

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeIn.duration(500)}
            style={styles.logoWrap}
          >
            <View style={styles.logoHalo}>
              <View style={styles.logoCore}>
                <MaterialCommunityIcons
                  name="recycle"
                  size={30}
                  color={dark.textOnTeal}
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(500)}>
            <Text style={styles.brand}>
              MedicalWaste<Text style={styles.brandAccent}>.kz</Text>
            </Text>
            <Text style={styles.subtitle}>{t('auth.signInSubtitle')}</Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(220).duration(500)}
            style={styles.segment}
          >
            <SegmentedControl
              segments={segments}
              activeKey={mode}
              onSelect={(k) => setMode(k as 'phone' | 'whatsapp' | 'email')}
            />
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(300).duration(500)}
            style={styles.card}
          >
            {mode === 'email' ? (
              <>
                <FormField
                  icon="email-outline"
                  placeholder={t('auth.email')}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <FormField
                  icon="lock-outline"
                  placeholder={t('auth.password')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </>
            ) : (
              <>
                <FormField
                  icon="phone-outline"
                  placeholder={t('auth.phonePlaceholder')}
                  value={phoneNumber}
                  onChangeText={(v) => setPhoneNumber(v || '+7')}
                  keyboardType="phone-pad"
                  hint={!codeSent ? t(mode === 'whatsapp' ? 'auth.whatsappHint' : 'auth.phoneHint') : undefined}
                />
                {codeSent ? (
                  <FormField
                    icon="message-text-outline"
                    placeholder={t('auth.code')}
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                  />
                ) : null}
              </>
            )}

            {error ? (
              <Animated.View entering={FadeIn.duration(200)}>
                <Text style={styles.error}>{error}</Text>
              </Animated.View>
            ) : null}

            <Button
              label={submitLabel}
              onPress={handleSubmit}
              loading={isSubmitting}
              fullWidth
              size="lg"
              style={styles.submit}
            />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).duration(500)}>
            <Text
              style={styles.link}
              onPress={() => navigation.navigate('Register')}
            >
              {t('auth.noAccount')}{' '}
              <Text style={styles.linkAccent}>{t('auth.createAccount')}</Text>
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
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoHalo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: dark.tealMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: dark.tealBorder,
  },
  logoCore: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
  brandAccent: { color: dark.teal },
  subtitle: {
    ...typography.body,
    color: dark.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  segment: {
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
    marginTop: spacing.xl,
    textAlign: 'center',
    ...typography.body,
    color: dark.textSecondary,
  },
  linkAccent: {
    color: dark.teal,
    fontWeight: '700',
  },
});
