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
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { fetchDriverProfile, fetchMedicalCompanies, registerDriver } from '../../services/drivers';
import { fetchProfile } from '../../services/auth';
import { useAuthStore } from '../../stores/authStore';
import { dark, spacing, typography } from '../../theme';
import { MedicalCompany } from '../../types/models';

export default function DriverRegistrationScreen() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthStore();

  const [companies, setCompanies] = useState<MedicalCompany[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);

  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [medicalCompanyId, setMedicalCompanyId] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');

  const isPending = user?.role === 'driver' && user?.verificationStatus === 'pending';
  const isRejected = user?.role === 'driver' && user?.verificationStatus === 'rejected';

  useEffect(() => {
    let active = true;
    setLoadingCompanies(true);
    fetchMedicalCompanies()
      .then((data) => {
        if (active) setCompanies(data);
      })
      .catch(() => {
        if (active) setError(t('driver.registration.loadCompaniesError'));
      })
      .finally(() => {
        if (active) setLoadingCompanies(false);
      });
    return () => {
      active = false;
    };
  }, [t]);

  useEffect(() => {
    let active = true;
    fetchDriverProfile()
      .then(() => {
        if (active) setHasProfile(true);
      })
      .catch(() => {
        if (active) setHasProfile(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const canSubmit = useMemo(() => (
    Boolean(licenseNumber && licenseExpiry && medicalCompanyId && vehiclePlate) &&
    !submitting &&
    !hasProfile &&
    !isPending
  ), [licenseNumber, licenseExpiry, medicalCompanyId, vehiclePlate, submitting, hasProfile, isPending]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await registerDriver({
        licenseNumber: licenseNumber.trim(),
        licenseExpiry: licenseExpiry.trim(),
        medicalCompanyId,
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
      });
      const updatedUser = await fetchProfile();
      setUser(updatedUser);
      setHasProfile(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || t('driver.registration.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.title}>{t('driver.registration.title')}</Text>
        <Text style={styles.subtitle}>{t('driver.registration.subtitle')}</Text>

      {isPending && (
        <View style={styles.banner}>
          <MaterialCommunityIcons name="clock-outline" size={18} color={dark.amber} />
          <Text style={styles.bannerText}>{t('driver.registration.pending')}</Text>
        </View>
      )}
      {isRejected && (
        <View style={[styles.banner, styles.bannerDanger]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color={dark.dangerText} />
          <Text style={styles.bannerText}>{t('driver.registration.rejected')}</Text>
        </View>
      )}

      {hasProfile && !isRejected ? (
        <View style={styles.banner}>
          <MaterialCommunityIcons name="check-circle-outline" size={18} color={dark.successText} />
          <Text style={styles.bannerText}>{t('driver.registration.submitted')}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('driver.registration.company')}</Text>
        {loadingCompanies ? (
          <View style={styles.centered}>
            <ActivityIndicator color={dark.teal} />
          </View>
        ) : (
          <View style={styles.companyList}>
            {companies.map((company) => {
              const isActive = medicalCompanyId === company._id;
              return (
                <TouchableOpacity
                  key={company._id}
                  style={[styles.companyCard, isActive && styles.companyCardActive]}
                  onPress={() => setMedicalCompanyId(company._id)}
                  activeOpacity={0.7}
                  disabled={isPending || hasProfile}
                >
                  <Text style={[styles.companyName, isActive && styles.companyNameActive]}>
                    {company.name}
                  </Text>
                  <Text style={styles.companyMeta}>
                    {t('driver.registration.license')} {company.licenseNumber ?? '—'}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {!companies.length && (
              <Text style={styles.helperText}>{t('driver.registration.noCompanies')}</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('driver.registration.details')}</Text>
        <Text style={styles.label}>{t('driver.registration.licenseNumber')}</Text>
        <TextInput
          style={styles.input}
          value={licenseNumber}
          onChangeText={setLicenseNumber}
          placeholder={t('driver.registration.licensePlaceholder')}
          placeholderTextColor={dark.muted}
          editable={!isPending && !hasProfile}
        />

        <Text style={styles.label}>{t('driver.registration.licenseExpiry')}</Text>
        <TextInput
          style={styles.input}
          value={licenseExpiry}
          onChangeText={setLicenseExpiry}
          placeholder={t('driver.registration.licenseExpiryPlaceholder')}
          placeholderTextColor={dark.muted}
          editable={!isPending && !hasProfile}
        />

        <Text style={styles.label}>{t('driver.registration.vehiclePlate')}</Text>
        <TextInput
          style={styles.input}
          value={vehiclePlate}
          onChangeText={setVehiclePlate}
          placeholder={t('driver.registration.vehiclePlaceholder')}
          placeholderTextColor={dark.muted}
          autoCapitalize="characters"
          editable={!isPending && !hasProfile}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color={dark.text} />
          ) : (
            <Text style={styles.buttonText}>{t('driver.registration.submit')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: dark.bg,
  },
  container: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  title: {
    ...typography.title,
    color: dark.text,
  },
  subtitle: {
    ...typography.body,
    color: dark.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dark.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.caption,
    color: dark.muted,
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: dark.muted,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: dark.card,
    color: dark.text,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: dark.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  companyList: {
    gap: spacing.sm,
  },
  companyCard: {
    backgroundColor: dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: dark.border,
    padding: spacing.md,
  },
  companyCardActive: {
    borderColor: dark.teal,
    backgroundColor: 'rgba(13, 148, 136, 0.18)',
  },
  companyName: {
    ...typography.body,
    color: dark.text,
    fontWeight: '600',
  },
  companyNameActive: {
    color: dark.teal,
  },
  companyMeta: {
    ...typography.caption,
    color: dark.muted,
    marginTop: spacing.xs,
  },
  helperText: {
    ...typography.caption,
    color: dark.muted,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: dark.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerDanger: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
  },
  bannerText: {
    ...typography.caption,
    color: dark.text,
    flex: 1,
  },
  button: {
    backgroundColor: dark.teal,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: spacing.md,
    shadowColor: dark.teal,
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...typography.body,
    color: dark.text,
    fontWeight: '600',
  },
  error: {
    color: dark.dangerText,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
});
