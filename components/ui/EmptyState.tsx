import { Colors, Fonts } from "@/constants/colors";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";

type EmptyStateProps = {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  description: string;
};

// Placeholder para listas vazias (notas, tarefas...): ícone, título e uma
// frase explicando para que serve a tela. A ação de criar fica no botão
// flutuante de cada tela, então não há botão aqui.
//
// Feito para ser usado como ListEmptyComponent de uma FlatList cujo
// contentContainerStyle tenha flexGrow: 1 — assim ele fica centralizado na
// área livre da tela.
export default function EmptyState({
  icon,
  title,
  description,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={44} color={Colors.primary} style={styles.icon} />

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingBottom: 48,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 18,
    textAlign: "center",
  },
  description: {
    color: "#FFFFFF99",
    fontFamily: Fonts.book,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 8,
  },
});
