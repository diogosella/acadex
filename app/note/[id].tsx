import FloatingMenu from "@/components/ui/FloatingMenu";
import { Colors, Fonts } from "@/constants/colors";
import { useNotes } from "@/contexts/notes-context";
import { useAnchoredMenu } from "@/hooks/use-anchored-menu";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NoteEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getNote, updateNote, deleteNote } = useNotes();
  const note = getNote(id);

  const [confirmVisible, setConfirmVisible] = useState(false);

  // Menu "..." flutuante, desenhado no container da tela e alinhado pela
  // direita do botão (ver hooks/use-anchored-menu.ts: pendurado embaixo do
  // botão, fora dos limites do pai, ele não recebia o toque no Android).
  const {
    containerRef,
    anchorRef,
    openMenu,
    position: menuPosition,
    toggle: toggleMenu,
    close: closeMenu,
    onContainerLayout,
  } = useAnchoredMenu<"options">({ maxHeight: 120, minWidth: 170, align: "right" });
  const menuOpen = openMenu === "options";

  if (!note) {
    return null;
  }

  const displayTitle = note.title.trim() || "Sem título";

  const handleConfirmDelete = () => {
    setConfirmVisible(false);
    deleteNote(note.id);
    router.back();
  };

  return (
    <View ref={containerRef} style={styles.container} onLayout={onContainerLayout}>
      <SafeAreaView style={styles.safe}>
        {menuOpen && <Pressable style={styles.menuBackdrop} onPress={closeMenu} />}

        <View style={styles.headerRow}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color={Colors.text} />
          </Pressable>

          <Pressable
            ref={anchorRef("options")}
            style={styles.iconButton}
            onPress={() => toggleMenu("options")}
            accessibilityRole="button"
            accessibilityLabel="Mais opções"
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={Colors.text} />
          </Pressable>
        </View>

        <TextInput
          style={styles.titleInput}
          value={note.title}
          onChangeText={(text) => updateNote(note.id, { title: text })}
          placeholder="Sem Título"
          placeholderTextColor="#FFFFFF80"
          multiline
        />

        <TextInput
          style={styles.contentInput}
          value={note.content}
          onChangeText={(text) => updateNote(note.id, { content: text })}
          placeholder="Comece a escrever..."
          placeholderTextColor="#FFFFFF80"
          multiline
          textAlignVertical="top"
        />
      </SafeAreaView>

      {/* Último filho do container: fica por cima do conteúdo da tela. */}
      <FloatingMenu position={menuOpen ? menuPosition : null} maxHeight={120}>
        <Pressable
          style={styles.menuItem}
          onPress={() => {
            closeMenu();
            setConfirmVisible(true);
          }}
        >
          <Text style={styles.menuItemText}>Deletar nota</Text>
        </Pressable>
      </FloatingMenu>

      <Modal
        transparent
        animationType="fade"
        visible={confirmVisible}
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalText}>Deseja deletar {displayTitle}?</Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>

              <Pressable style={styles.modalDeleteButton} onPress={handleConfirmDelete}>
                <Text style={styles.modalDeleteText}>Deletar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const TITLE_LINE_HEIGHT = 34;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    zIndex: 2,
  },
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    color: Colors.text,
    fontFamily: Fonts.book,
    fontSize: 14,
  },
  titleInput: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 28,
    lineHeight: TITLE_LINE_HEIGHT,
    maxHeight: TITLE_LINE_HEIGHT * 3,
    marginTop: 16,
  },
  contentInput: {
    flex: 1,
    color: Colors.text,
    fontFamily: Fonts.book,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#000000B0",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  modalCard: {
    width: "100%",
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: `${Colors.primary}4D`,
    borderRadius: 12,
    padding: 20,
  },
  modalText: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalCancelText: {
    color: Colors.text,
    fontFamily: Fonts.book,
    fontSize: 14,
  },
  modalDeleteButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  modalDeleteText: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
});
