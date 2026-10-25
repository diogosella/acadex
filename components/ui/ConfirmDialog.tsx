import { Colors, Fonts } from "@/constants/colors";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

// Confirmação de ação destrutiva (excluir tarefa, evento ou assunto). Mesmo
// visual da confirmação de "Restaurar configurações".
export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={[styles.actions, !message && styles.actionsNoMessage]}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.confirmButton, pressed && styles.confirmPressed]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#000000B0",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: `${Colors.primary}4D`,
    borderRadius: 12,
    padding: 20,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 16,
    textAlign: "center",
  },
  message: {
    color: "#FFFFFFB3",
    fontFamily: Fonts.book,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  actionsNoMessage: {
    marginTop: 20,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelText: {
    color: Colors.text,
    fontFamily: Fonts.book,
    fontSize: 14,
  },
  confirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  confirmPressed: {
    opacity: 0.85,
  },
  confirmText: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
});
