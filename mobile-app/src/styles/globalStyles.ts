import { StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, shadows } from './theme';

export const globalStyles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenPadding: {
    padding: spacing.lg,
  },
  screenHeader: {
    marginBottom: spacing.xxxl,
    paddingTop: spacing.md,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  screenSubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 24,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  successBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  successBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  warningBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  warningBadgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  dangerBadge: {
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  dangerBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});
