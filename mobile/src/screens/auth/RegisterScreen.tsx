import React, { useEffect, useMemo, useState } from 'react';
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
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuthStore } from '../../stores/authStore';
import { RootStackParamList } from '../../types/navigation';

const BG = '#0f172a';
const SURFACE = 'rgba(30, 41, 59, 0.8)';
const BORDER = 'rgba(51, 65, 85, 0.5)';
const BORDER_ACTIVE = 'rgba(13, 148, 136, 0.8)';
const MUTED = '#64748b';
const TEAL = '#0d9488';
const TEXT_LIGHT = '#f1f5f9';

/* ── Animated input with icon & focus glow ──────────────────────────── */

interface GlowInputProps {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: TextInput['props']['keyboardType'];
  autoCapitalize?: TextInput['props']['autoCapitalize'];
}

function GlowInput({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}: GlowInputProps) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const focus = useSharedValue(0);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [BORDER, BORDER_ACTIVE]),
  }));

  return (
    <Animated.View style={[styles.inputRow, borderStyle, focused && styles.inputGlow]}>
      <MaterialCommunityIcons
        name={icon as any}
        size={20}
        color={focused ? TEAL : MUTED}
        style={styles.inputIcon}
      />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={MUTED}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => {
          setFocused(true);
          focus.value = withTiming(1, { duration: 250 });
        }}
        onBlur={() => {
          setFocused(false);
          focus.value = withTiming(0, { duration: 250 });
        }}
        secureTextEntry={secureTextEntry && !visible}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={styles.inputText}
      />
      {secureTextEntry ? (
        <TouchableOpacity onPress={() => setVisible((v) => !v)} hitSlop={8}>
          <MaterialCommunityIcons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={MUTED}
          />
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
}

/* ── Register screen ────────────────────────────────────────────────── */

export default function RegisterScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { register } = useAuthStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+7');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (!firstName || !lastName || !phoneNumber || !password || !passwordConfirm) {
      return false;
    }
    if (password !== passwordConfirm) return false;
    return true;
  }, [
    firstName,
    lastName,
    phoneNumber,
    email,
    password,
    passwordConfirm,
  ]);

  /* pulsing glow orb */
  const pulse = useSharedValue(0.6);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);
  const orbGlow = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 0.9 + pulse.value * 0.1 }],
  }));

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
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
    >
      <View style={styles.bgBlob1} />
      <View style={styles.bgBlob2} />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* glow orb */}
        <Animated.View entering={FadeIn.duration(800)} style={styles.orbWrapper}>
          <Animated.View style={[styles.orbRings, orbGlow]}>
            <View style={styles.ring3} />
            <View style={styles.ring2} />
            <View style={styles.ring1} />
          </Animated.View>
          <View style={styles.orbCore}>
            <MaterialCommunityIcons name="account-plus-outline" size={28} color="#fff" />
          </View>
        </Animated.View>

        {/* branding */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)}>
          <Text style={styles.brand}>{t('auth.registerTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.registerSubtitle')}</Text>
        </Animated.View>

        {/* form */}
        <Animated.View entering={FadeInDown.delay(400).duration(600)}>
          <GlowInput
            icon="account-box-outline"
            placeholder={t('auth.firstName')}
            value={firstName}
            onChangeText={setFirstName}
          />
          <GlowInput
            icon="account-box"
            placeholder={t('auth.lastName')}
            value={lastName}
            onChangeText={setLastName}
          />
          <GlowInput
            icon="phone-outline"
            placeholder={t('auth.phonePlaceholder')}
            value={phoneNumber}
            onChangeText={(value) => setPhoneNumber(value || '+7')}
            keyboardType="phone-pad"
          />
          <Text style={styles.hint}>{t('auth.phoneHint')}</Text>
          <GlowInput
            icon="email-outline"
            placeholder={t('auth.emailOptional')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={styles.hint}>{t('auth.emailOptionalHint')}</Text>

          <GlowInput
            icon="lock-outline"
            placeholder={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Text style={styles.hint}>{t('auth.passwordHint')}</Text>

          <GlowInput
            icon="lock-check-outline"
            placeholder={t('auth.confirmPassword')}
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            secureTextEntry
          />
        </Animated.View>

        {error ? (
          <Animated.View entering={FadeIn.duration(300)}>
            <Text style={styles.error}>{error}</Text>
          </Animated.View>
        ) : null}

        {/* button */}
        <Animated.View entering={FadeInDown.delay(600).duration(600)}>
          <TouchableOpacity
            style={[styles.button, (!canSubmit || isSubmitting) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('auth.register')}</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* link to login */}
        <Animated.View entering={FadeInDown.delay(700).duration(600)}>
          <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>
              {t('auth.hasAccount')}{' '}
              <Text style={styles.linkAccent}>{t('auth.signIn')}</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  container: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },

  /* ambient background blobs */
  bgBlob1: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(13, 148, 136, 0.06)',
  },
  bgBlob2: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(59, 130, 246, 0.04)',
  },

  /* pulsing orb (compact for register) */
  orbWrapper: {
    alignSelf: 'center',
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  orbRings: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring3: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(13, 148, 136, 0.06)',
  },
  ring2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
  },
  ring1: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(13, 148, 136, 0.22)',
  },
  orbCore: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },

  /* branding */
  brand: { fontSize: 24, fontWeight: '700', color: TEXT_LIGHT, textAlign: 'center' },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 28,
  },

  /* role selector */
  roleLabel: { color: MUTED, fontSize: 13, marginBottom: 10 },
  roleRow: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  rolePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  rolePillActive: {
    borderColor: TEAL,
    backgroundColor: TEAL,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  rolePillText: { fontSize: 13, color: MUTED },
  rolePillTextActive: { color: '#fff', fontWeight: '600' },

  /* hint */
  hint: { color: MUTED, fontSize: 12, marginTop: -8, marginBottom: 12 },

  /* form inputs */
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    marginBottom: 16,
  },
  inputGlow: {
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  inputIcon: { marginRight: 12 },
  inputText: { flex: 1, fontSize: 15, color: TEXT_LIGHT },

  /* error */
  error: { color: '#f87171', fontSize: 13, textAlign: 'center', marginBottom: 12 },

  /* button */
  button: {
    backgroundColor: TEAL,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  /* link */
  link: { marginTop: 24, alignItems: 'center', marginBottom: 20 },
  linkText: { color: MUTED, fontSize: 14 },
  linkAccent: { color: TEAL, fontWeight: '600' },
});
