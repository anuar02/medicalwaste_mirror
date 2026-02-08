import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
  FadeInUp,
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

/* ── Login screen ───────────────────────────────────────────────────── */

export default function LoginScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await login(email.trim(), password);
    } catch {
      setError(t('auth.invalidCredentials'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.bgBlob1} />
      <View style={styles.bgBlob2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* glow orb */}
        <Animated.View entering={FadeIn.duration(800)} style={styles.orbWrapper}>
          <Animated.View style={[styles.orbRings, orbGlow]}>
            <View style={styles.ring3} />
            <View style={styles.ring2} />
            <View style={styles.ring1} />
          </Animated.View>
          <View style={styles.orbCore}>
            <MaterialCommunityIcons name="recycle" size={32} color="#fff" />
          </View>
        </Animated.View>

        {/* branding */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)}>
          <Text style={styles.brand}>
            MedicalWaste<Text style={styles.brandAccent}>.kz</Text>
          </Text>
          <Text style={styles.subtitle}>{t('auth.signInSubtitle')}</Text>
        </Animated.View>

        {/* form */}
        <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.form}>
          <GlowInput
            icon="email-outline"
            placeholder={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <GlowInput
            icon="lock-outline"
            placeholder={t('auth.password')}
            value={password}
            onChangeText={setPassword}
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
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('auth.signIn')}</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* link to register */}
        <Animated.View entering={FadeInUp.delay(800).duration(600)}>
          <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>
              {t('auth.noAccount')}{' '}
              <Text style={styles.linkAccent}>{t('auth.createAccount')}</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },

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

  /* pulsing orb */
  orbWrapper: {
    alignSelf: 'center',
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  orbRings: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring3: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(13, 148, 136, 0.06)',
  },
  ring2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
  },
  ring1: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(13, 148, 136, 0.22)',
  },
  orbCore: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
  brand: { fontSize: 28, fontWeight: '700', color: TEXT_LIGHT, textAlign: 'center' },
  brandAccent: { color: TEAL },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 36,
  },

  /* form */
  form: { marginBottom: 8 },
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
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  /* link */
  link: { marginTop: 28, alignItems: 'center' },
  linkText: { color: MUTED, fontSize: 14 },
  linkAccent: { color: TEAL, fontWeight: '600' },
});
