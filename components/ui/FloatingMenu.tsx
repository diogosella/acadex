import { Colors } from "@/constants/colors";
import type { AnchoredMenuPosition } from "@/hooks/use-anchored-menu";
import { ReactNode } from "react";
import { ScrollView, StyleSheet } from "react-native";

type FloatingMenuProps = {
  // null = fechado (ou ainda não medido).
  position: AnchoredMenuPosition | null;
  maxHeight: number;
  children: ReactNode;
};

// Lista flutuante usada pelos dropdowns e menus do app (ver
// hooks/use-anchored-menu.ts). Deve ser renderizada como ÚLTIMO filho do
// container do menu (fundo do modal ou tela), para ficar por cima de tudo.
export default function FloatingMenu({ position, maxHeight, children }: FloatingMenuProps) {
  if (!position) return null;

  return (
    <ScrollView
      style={[styles.list, { maxHeight }, position]}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    position: "absolute",
    backgroundColor: `${Colors.primary}F2`,
    borderRadius: 10,
    paddingVertical: 4,
    elevation: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
