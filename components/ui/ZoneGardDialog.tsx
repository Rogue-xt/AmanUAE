import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Theme } from "@/constants/Theme";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

export type ZoneGardDialogAction = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "success" | "ghost" | "danger";
  disabled?: boolean;
};

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  icon?: React.ComponentProps<typeof FontAwesome6>["name"];
  children?: React.ReactNode;
  primaryAction?: ZoneGardDialogAction;
  secondaryAction?: ZoneGardDialogAction;
  destructiveAction?: ZoneGardDialogAction;
  onClose: () => void;
  closeDisabled?: boolean;
};

type DialogConfig = Omit<Props, "visible" | "onClose">;

export function useZoneGardDialog() {
  const [config, setConfig] = React.useState<DialogConfig | null>(null);
  const closeDialog = () => setConfig(null);
  const wrapAction = (
    action: ZoneGardDialogAction | undefined,
  ): ZoneGardDialogAction | undefined =>
    action
      ? {
          ...action,
          onPress: () => {
            closeDialog();
            action.onPress();
          },
        }
      : undefined;

  return {
    showDialog: (nextConfig: DialogConfig) => setConfig(nextConfig),
    closeDialog,
    dialog: (
      <ZoneGardDialog
        {...config}
        visible={!!config}
        title={config?.title ?? ""}
        onClose={closeDialog}
        primaryAction={wrapAction(config?.primaryAction)}
        secondaryAction={wrapAction(config?.secondaryAction)}
        destructiveAction={wrapAction(config?.destructiveAction)}
      />
    ),
  };
}

export function ZoneGardDialog({
  visible,
  title,
  message,
  icon = "circle-info",
  children,
  primaryAction,
  secondaryAction,
  destructiveAction,
  onClose,
  closeDisabled = false,
}: Props) {
  const requestClose = () => {
    if (!closeDisabled) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={requestClose}
    >
      <View style={styles.overlay}>
        <View
          accessibilityViewIsModal
          accessibilityLabel={title}
          style={styles.card}
        >
          <View style={styles.header}>
            <View style={styles.iconBox}>
              <FontAwesome6
                name={icon}
                size={19}
                color={Theme.colors.primaryGlow}
              />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              disabled={closeDisabled}
              onPress={requestClose}
              style={styles.closeButton}
            >
              <FontAwesome6
                name="xmark"
                size={16}
                color={Theme.colors.textSecondary}
              />
            </Pressable>
          </View>

          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            {message ? <Text style={styles.message}>{message}</Text> : null}
            {children}
          </ScrollView>

          {(primaryAction || secondaryAction || destructiveAction) && (
            <View style={styles.actions}>
              {primaryAction && (
                <PrimaryButton
                  label={primaryAction.label}
                  onPress={primaryAction.onPress}
                  variant={primaryAction.variant}
                  disabled={primaryAction.disabled}
                />
              )}
              {secondaryAction && (
                <PrimaryButton
                  label={secondaryAction.label}
                  onPress={secondaryAction.onPress}
                  variant={secondaryAction.variant ?? "ghost"}
                  disabled={secondaryAction.disabled}
                />
              )}
              {destructiveAction && (
                <PrimaryButton
                  label={destructiveAction.label}
                  onPress={destructiveAction.onPress}
                  variant="danger"
                  disabled={destructiveAction.disabled}
                />
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: Theme.spacing.xl,
    backgroundColor: "rgba(10, 10, 10, 0.5)",
  },
  card: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "85%",
    alignSelf: "center",
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xxl,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.xl,
    ...Theme.shadow.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.md,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: Theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Theme.colors.primaryMuted,
  },
  title: {
    flex: 1,
    color: Theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "900",
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  bodyScroll: {
    flexGrow: 0,
  },
  body: {
    paddingTop: Theme.spacing.lg,
  },
  message: {
    color: Theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  actions: {
    gap: Theme.spacing.sm,
    paddingTop: Theme.spacing.xl,
  },
});
