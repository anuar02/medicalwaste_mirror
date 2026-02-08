import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';

import { useAuthStore } from '../../stores/authStore';
import { updateProfile } from '../../services/auth';
import { fetchDriverProfile } from '../../services/drivers';
import { dark, darkInput, spacing, typography } from '../../theme';
import i18n, { LANGUAGE_KEY } from '../../i18n';
import { DriverProfile } from '../../types/models';

type EditableField = 'phone' | 'plate';

function getInitials(firstName?: string, lastName?: string, fallback?: string): string {
  const first = firstName?.trim();
  const last = lastName?.trim();
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) return first.slice(0, 2).toUpperCase();
  if (last) return last.slice(0, 2).toUpperCase();
  if (fallback) return fallback.slice(0, 2).toUpperCase();
  return '??';
}

function getCompanyName(company: unknown): string | null {
  if (!company) return null;
  if (typeof company === 'string') return company;
  if (typeof company === 'object' && company && 'name' in company) {
    const name = (company as { name?: string }).name;
    if (name) return name;
  }
  return null;
}

function getCompanyPhone(company: unknown): string | null {
  if (typeof company === 'object' && company && 'contactInfo' in company) {
    const contactInfo = (company as { contactInfo?: { phone?: string } }).contactInfo;
    if (contactInfo?.phone) return contactInfo.phone;
  }
  return null;
}

function formatDate(iso?: string, lang?: string): string {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    return date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export default function DriverSettings() {
  const { t } = useTranslation();
  const { logout, user, setUser } = useAuthStore();

  const [editField, setEditField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [driverLoading, setDriverLoading] = useState(false);

  const companyName = useMemo(() => getCompanyName(user?.company), [user?.company]);
  const companyPhone = useMemo(() => getCompanyPhone(user?.company), [user?.company]);
  const fullName = useMemo(() => {
    const first = user?.firstName?.trim();
    const last = user?.lastName?.trim();
    if (first && last) return `${first} ${last}`;
    return first || last || user?.username || t('driver.profile.notSet');
  }, [t, user?.firstName, user?.lastName, user?.username]);

  const verificationStatus = user?.verificationStatus;
  const verificationChip = useMemo(() => {
    if (!verificationStatus) return null;
    switch (verificationStatus) {
      case 'approved':
        return { label: t('driver.profile.approved'), bg: dark.success, color: dark.successText };
      case 'pending':
        return { label: t('driver.profile.pendingReview'), bg: dark.amberMuted, color: dark.amber };
      case 'rejected':
        return { label: t('driver.profile.rejected'), bg: dark.danger, color: dark.dangerText };
      default:
        return null;
    }
  }, [verificationStatus, t]);

  const openEdit = useCallback((field: EditableField) => {
    switch (field) {
      case 'phone':
        setEditValue(user?.phoneNumber ?? '');
        break;
      case 'plate':
        setEditValue(user?.vehicleInfo?.plateNumber ?? '');
        break;
    }
    setEditField(field);
  }, [user]);

  const fieldLabel = useMemo(() => {
    switch (editField) {
      case 'phone': return t('driver.profile.phone');
      case 'plate': return t('driver.profile.vehicle');
      default: return '';
    }
  }, [editField, t]);

  const handleSave = useCallback(async () => {
    if (!editField) return;
    setSaving(true);
    try {
      let fields: Parameters<typeof updateProfile>[0] = {};
      switch (editField) {
        case 'phone':
          fields = { phoneNumber: editValue.trim().replace(/[^\d+]/g, '') };
          break;
        case 'plate':
          fields = { vehicleInfo: { plateNumber: editValue.trim() } };
          break;
      }
      const updatedUser = await updateProfile(fields);
      setUser(updatedUser);
      setEditField(null);
    } catch {
      Alert.alert(t('driver.profile.updateError'));
    } finally {
      setSaving(false);
    }
  }, [editField, editValue, setUser, t]);

  const handleToggleLanguage = async () => {
    const next = i18n.language === 'ru' ? 'en' : 'ru';
    await i18n.changeLanguage(next);
    await AsyncStorage.setItem(LANGUAGE_KEY, next);
  };

  useEffect(() => {
    if (user?.role !== 'driver') return;
    let active = true;
    setDriverLoading(true);
    fetchDriverProfile()
      .then((profile) => {
        if (active) setDriverProfile(profile);
      })
      .catch(() => {
        if (active) setDriverProfile(null);
      })
      .finally(() => {
        if (active) setDriverLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.role]);

  const licenseExpiryText = useMemo(
    () => formatDate(driverProfile?.licenseExpiry, i18n.language),
    [driverProfile?.licenseExpiry, i18n.language],
  );

  const emergencyContactText = useMemo(() => {
    const contact = driverProfile?.emergencyContact;
    const parts = [contact?.name, contact?.phone, contact?.relationship].filter(Boolean);
    return parts.length ? parts.join(' · ') : t('driver.profile.notSet');
  }, [driverProfile?.emergencyContact, t]);

  const certificationsText = useMemo(() => {
    if (!driverProfile?.certifications?.length) return t('driver.profile.notSet');
    const names = driverProfile.certifications.map((cert) => cert.name).filter(Boolean);
    return names.length ? names.join(', ') : t('driver.profile.notSet');
  }, [driverProfile?.certifications, t]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* ── Avatar ── */}
        <Animated.View entering={ZoomIn.springify()} style={styles.avatarWrapper}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(user?.firstName, user?.lastName, user?.username)}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(60).springify()} style={styles.headerInfo}>
          <Text style={styles.headerName}>{fullName}</Text>
          <Text style={styles.headerSub}>
            {t(`roles.${user?.role ?? 'driver'}`)}
            {companyName ? ` · ${companyName}` : ''}
          </Text>
          {verificationChip ? (
            <View style={[styles.chip, { backgroundColor: verificationChip.bg }]}>
              <Text style={[styles.chipText, { color: verificationChip.color }]}>
                {verificationChip.label}
              </Text>
            </View>
          ) : null}
        </Animated.View>

        {/* ── Personal Information ── */}
        <Animated.View entering={FadeInUp.delay(140).springify()}>
          <Text style={styles.sectionLabel}>{t('driver.profile.personalInfo').toUpperCase()}</Text>
          <View style={styles.card}>
            <InfoRow
              icon="account-outline"
              label={t('driver.profile.name')}
              value={fullName}
            />
            <Divider />
            <InfoRow
              icon="email-outline"
              label={t('driver.profile.email')}
              value={user?.email ?? t('driver.profile.notSet')}
            />
            <Divider />
            <InfoRow
              icon="phone-outline"
              label={t('driver.profile.phone')}
              value={user?.phoneNumber ?? t('driver.profile.notSet')}
              editable
              onPress={() => openEdit('phone')}
            />
          </View>
        </Animated.View>

        {/* ── Vehicle ── */}
        <Animated.View entering={FadeInUp.delay(220).springify()}>
          <Text style={styles.sectionLabel}>{t('driver.profile.vehicleInfo').toUpperCase()}</Text>
          <View style={styles.card}>
            <InfoRow
              icon="truck-outline"
              label={t('driver.profile.vehicle')}
              value={user?.vehicleInfo?.plateNumber ?? t('driver.profile.notSet')}
              editable
              onPress={() => openEdit('plate')}
            />
            <Divider />
            <InfoRow
              icon="truck-outline"
              label={t('driver.profile.vehicleModel')}
              value={driverProfile?.vehicleInfo?.model ?? t('driver.profile.notSet')}
            />
            <Divider />
            <InfoRow
              icon="calendar-outline"
              label={t('driver.profile.vehicleYear')}
              value={
                driverProfile?.vehicleInfo?.year
                  ? String(driverProfile.vehicleInfo.year)
                  : t('driver.profile.notSet')
              }
            />
            <Divider />
            <InfoRow
              icon="weight-kilogram"
              label={t('driver.profile.vehicleCapacity')}
              value={
                driverProfile?.vehicleInfo?.capacity
                  ? `${driverProfile.vehicleInfo.capacity}`
                  : t('driver.profile.notSet')
              }
            />
          </View>
        </Animated.View>

        {/* ── Driver Credentials ── */}
        <Animated.View entering={FadeInUp.delay(260).springify()}>
          <Text style={styles.sectionLabel}>{t('driver.profile.credentials').toUpperCase()}</Text>
          <View style={styles.card}>
            <InfoRow
              icon="card-account-details-outline"
              label={t('driver.profile.licenseNumber')}
              value={driverProfile?.licenseNumber ?? t('driver.profile.notSet')}
            />
            <Divider />
            <InfoRow
              icon="calendar-clock"
              label={t('driver.profile.licenseExpiry')}
              value={driverProfile?.licenseExpiry ? licenseExpiryText : t('driver.profile.notSet')}
            />
            <Divider />
            <InfoRow
              icon="account-alert-outline"
              label={t('driver.profile.emergencyContact')}
              value={emergencyContactText}
            />
            <Divider />
            <InfoRow
              icon="certificate-outline"
              label={t('driver.profile.certifications')}
              value={certificationsText}
            />
          </View>
          {driverLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={dark.teal} size="small" />
            </View>
          ) : null}
        </Animated.View>

        {/* ── Preferences ── */}
        <Animated.View entering={FadeInUp.delay(300).springify()}>
          <Text style={styles.sectionLabel}>{t('driver.profile.preferences').toUpperCase()}</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={handleToggleLanguage} activeOpacity={0.6}>
              <MaterialCommunityIcons name="web" size={20} color={dark.teal} style={styles.rowIcon} />
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>{t('driver.profile.language')}</Text>
                <Text style={styles.rowValue}>{i18n.language.toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
            <Divider />
            <TouchableOpacity
              style={[styles.row, !companyPhone && styles.rowDisabled]}
              onPress={() => companyPhone && Linking.openURL(`tel:${companyPhone}`)}
              disabled={!companyPhone}
              activeOpacity={0.6}
            >
              <MaterialCommunityIcons name="phone-outline" size={20} color={dark.teal} style={styles.rowIcon} />
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>{t('driver.profile.contactSupervisor')}</Text>
                <Text style={styles.rowValue}>{companyPhone ?? t('driver.profile.notSet')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Account ── */}
        <Animated.View entering={FadeInUp.delay(380).springify()}>
          <Text style={styles.sectionLabel}>{t('driver.profile.account').toUpperCase()}</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <MaterialCommunityIcons name="calendar-outline" size={20} color={dark.teal} style={styles.rowIcon} />
              <View style={styles.rowContent}>
                <Text style={styles.rowValue}>
                  {t('driver.profile.memberSince', { date: formatDate(user?.createdAt, i18n.language) })}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── Logout ── */}
        <Animated.View entering={FadeInUp.delay(460).springify()}>
          <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.7}>
            <Text style={styles.logoutText}>{t('common.logout')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* ── Edit Modal ── */}
      <Modal visible={editField !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t('driver.profile.editTitle', { field: fieldLabel })}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={editValue}
              onChangeText={setEditValue}
              placeholderTextColor={dark.muted}
              autoFocus
              keyboardType={editField === 'phone' ? 'phone-pad' : 'default'}
              autoCapitalize={editField === 'plate' ? 'characters' : 'none'}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setEditField(null)}
                disabled={saving}
              >
                <Text style={styles.modalCancelText}>{t('driver.profile.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, saving && styles.modalSaveDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={dark.text} size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>{t('driver.profile.save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ── Sub-components ── */

function InfoRow({
  icon,
  label,
  value,
  editable,
  onPress,
}: {
  icon: string;
  label: string;
  value: string;
  editable?: boolean;
  onPress?: () => void;
}) {
  const Wrapper = editable ? TouchableOpacity : View;
  return (
    <Wrapper style={styles.row} onPress={onPress} activeOpacity={0.6}>
      <MaterialCommunityIcons name={icon as any} size={20} color={dark.teal} style={styles.rowIcon} />
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
      {editable ? (
        <MaterialCommunityIcons name="chevron-right" size={20} color={dark.muted} />
      ) : null}
    </Wrapper>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

/* ── Styles ── */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: dark.bg,
  },
  container: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },

  /* Avatar */
  avatarWrapper: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: dark.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },

  /* Header info */
  headerInfo: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerName: {
    ...typography.title,
    color: dark.text,
  },
  headerSub: {
    ...typography.caption,
    color: dark.textSecondary,
    marginTop: spacing.xs,
  },
  chip: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  chipText: {
    ...typography.caption,
    fontWeight: '600',
  },

  /* Section labels */
  sectionLabel: {
    ...typography.caption,
    color: dark.muted,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },

  /* Card */
  card: {
    backgroundColor: dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dark.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  /* Rows */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowIcon: {
    marginRight: spacing.md,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    ...typography.caption,
    color: dark.muted,
  },
  rowValue: {
    ...typography.body,
    color: dark.text,
  },
  divider: {
    height: 1,
    backgroundColor: dark.border,
    marginVertical: spacing.xs,
  },
  loadingRow: {
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },

  /* Logout */
  logoutButton: {
    backgroundColor: dark.danger,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  logoutText: {
    color: dark.dangerText,
    fontWeight: '600',
    fontSize: 15,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalContent: {
    backgroundColor: dark.bg,
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: dark.border,
  },
  modalTitle: {
    ...typography.title,
    color: dark.text,
    marginBottom: spacing.lg,
  },
  modalInput: {
    ...darkInput,
    color: dark.text,
    fontSize: 15,
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  modalCancel: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  modalCancelText: {
    ...typography.body,
    color: dark.muted,
  },
  modalSave: {
    backgroundColor: dark.teal,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: 10,
  },
  modalSaveDisabled: {
    opacity: 0.6,
  },
  modalSaveText: {
    ...typography.body,
    color: dark.text,
    fontWeight: '600',
  },
});
