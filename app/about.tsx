import { Colors, Fonts } from "@/constants/colors";
import { hapticSelection } from "@/lib/haptics";
import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// "Sobre e ajuda" (aberta pelas Configurações): perguntas frequentes sobre
// como usar o app e os créditos do TG. Conteúdo estático.

type FaqItem = {
  question: string;
  answer: string;
};

const FAQ: FaqItem[] = [
  {
    question: "O que é a técnica Pomodoro?",
    answer:
      "É um método de estudo que alterna blocos de foco com pausas curtas. Depois de alguns ciclos, vem uma pausa mais longa. No ACADEX o padrão é 25 minutos de foco, 5 de pausa curta e 15 de pausa longa a cada 4 ciclos. Tudo isso pode ser ajustado em Configurações.",
  },
  {
    question: "Como inicio, pauso ou cancelo uma sessão?",
    answer:
      "Toque no círculo vermelho do Pomodoro para começar. Durante a sessão, toque de novo no círculo para pausar ou retomar. Para cancelar sem contar a sessão, segure o círculo. Os marcadores de progresso embaixo mostram as sessões completadas na rodada atual: ao completar 5, você recebe os parabéns e eles recomeçam.",
  },
  {
    question: "Como crio um evento com lembrete?",
    answer:
      "No Calendário, toque no dia desejado, preencha o título e a hora e escolha em \"Notificar\" quando quer ser avisado. Para trocar de mês, deslize para os lados ou use as setas. Para editar, mudar o dia ou excluir um evento, toque nele.",
  },
  {
    question: "Por que não recebo as notificações?",
    answer:
      "Confira em Configurações > Notificações se elas estão ativadas. Se estiverem bloqueadas, toque em \"Abrir ajustes\" e permita as notificações do app. Alguns celulares também limitam apps em segundo plano para economizar bateria: nesse caso, desative a otimização de bateria do app.",
  },
  {
    question: "Como organizo minhas tarefas?",
    answer:
      "Na aba Tarefas, toque em + para criar uma tarefa com prioridade e assunto. Os assuntos têm cores e podem ser criados no próprio formulário (+); o lápis ao lado de cada assunto na lista permite renomear, trocar a cor ou excluir. Toque numa tarefa para editá-la ou excluí-la. Ao marcar uma tarefa como concluída, aparece também a lixeira para removê-la.",
  },
  {
    question: "Onde vejo meu histórico?",
    answer:
      "No Pomodoro, toque no ícone de gráfico no canto superior esquerdo (ou nos marcadores de progresso). O histórico mostra o total de sessões, o tempo de foco, os dias seguidos, um mapa dos últimos 90 dias e a atividade recente, com os focos e as tarefas concluídas.",
  },
  {
    question: "Onde ficam os meus dados?",
    answer:
      "Tudo fica salvo apenas neste aparelho: não há conta nem envio de dados para a internet. Se o app for desinstalado, os dados são apagados junto.",
  },
];

export default function AboutScreen() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={({ pressed }) => [styles.backButton, pressed && styles.backPressed]}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Sobre e ajuda</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Text style={styles.appName}>ACADEX</Text>
            <Text style={styles.tagline}>
              Pomodoro, notas, calendário e tarefas em um só lugar para organizar a vida
              acadêmica.
            </Text>
            <Text style={styles.version}>Versão {version}</Text>
          </View>

          <Text style={styles.sectionTitle}>Perguntas frequentes</Text>
          <View style={styles.card}>
            {FAQ.map((item, index) => {
              const open = openIndex === index;
              return (
                <View
                  key={item.question}
                  style={[styles.faqItem, index < FAQ.length - 1 && styles.divider]}
                >
                  <Pressable
                    onPress={() => {
                      hapticSelection();
                      setOpenIndex(open ? null : index);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    style={styles.faqQuestionRow}
                  >
                    <Text style={styles.faqQuestion}>{item.question}</Text>
                    <Ionicons
                      name={open ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#FFFFFF80"
                    />
                  </Pressable>
                  {open && (
                    <Animated.Text entering={FadeIn.duration(180)} style={styles.faqAnswer}>
                      {item.answer}
                    </Animated.Text>
                  )}
                </View>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Créditos</Text>
          <View style={[styles.card, styles.credits]}>
            <Image
              source={require("../assets/images/fatec-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.creditsText}>
              Trabalho de Graduação do curso de Análise e Desenvolvimento de Sistemas da Fatec
              Ourinhos.
            </Text>

            <Text style={styles.creditsLabel}>Desenvolvido por</Text>
            <Text style={styles.creditsName}>Diogo Correa Sela</Text>
            <Text style={styles.creditsName}>Hugo Santana Raphael</Text>

            <Text style={styles.creditsLabel}>Orientação</Text>
            <Text style={styles.creditsName}>Prof. Isaque Katahira</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safe: {
    flex: 1,
  },
  headerRow: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  backPressed: {
    backgroundColor: "#FFFFFF14",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 22,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  hero: {
    alignItems: "center",
    paddingVertical: 20,
  },
  appName: {
    color: Colors.primary,
    fontFamily: Fonts.bold,
    fontSize: 34,
    letterSpacing: 1,
  },
  tagline: {
    color: "#FFFFFFB3",
    fontFamily: Fonts.book,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 12,
  },
  version: {
    color: "#FFFFFF66",
    fontFamily: Fonts.book,
    fontSize: 11,
    marginTop: 10,
  },
  sectionTitle: {
    color: "#FFFFFF80",
    fontFamily: Fonts.bold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  faqItem: {
    paddingVertical: 14,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  faqQuestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  faqQuestion: {
    flex: 1,
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  faqAnswer: {
    color: "#FFFFFFB3",
    fontFamily: Fonts.book,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  credits: {
    paddingVertical: 18,
  },
  logo: {
    width: 96,
    height: 42,
    tintColor: Colors.text,
    marginBottom: 12,
  },
  creditsText: {
    color: "#FFFFFFB3",
    fontFamily: Fonts.book,
    fontSize: 13,
    lineHeight: 19,
  },
  creditsLabel: {
    color: "#FFFFFF80",
    fontFamily: Fonts.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 4,
  },
  creditsName: {
    color: Colors.text,
    fontFamily: Fonts.book,
    fontSize: 14,
    marginTop: 2,
  },
});
