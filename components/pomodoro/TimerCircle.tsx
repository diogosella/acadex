import { Colors, Fonts } from "@/constants/colors";
import { durationForPhase, formatCountdown, PHASE_LABELS } from "@/constants/pomodoro-options";
import { usePomodoro } from "@/contexts/pomodoro-context";
import { usePomodoroSettings } from "@/contexts/pomodoro-settings-context";
import { hapticSelection } from "@/lib/haptics";
import Ionicons from "@expo/vector-icons/Ionicons";
import { PomodoroPhase } from "@/types/pomodoro";
import { useEffect } from "react";
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

// Botão principal do Pomodoro. Cada estado tem um visual próprio:
//   - parado (idle): círculo vermelho cheio com a marca e um "pulso" em volta,
//     convidando ao toque;
//   - foco: o círculo vai se enchendo de vermelho de baixo para cima conforme
//     o tempo passa, com a contagem no centro;
//   - pausa curta/longa: o mesmo, em azul (Colors.accent), para diferenciar
//     descanso de foco;
//   - pausado: o preenchimento fica esmaecido e o pulso volta, mais lento,
//     indicando que é preciso tocar para continuar.
// Toque: iniciar/pausar/retomar. Toque longo: cancelar a sessão.

// Diâmetro do círculo: fração da tela, dentro de [MIN_SIZE, MAX_SIZE].
const MIN_SIZE = 200;
const MAX_SIZE = 280;

// Proporções em relação ao diâmetro (o conteúdo escala junto com o círculo).
const BRAND_FONT_RATIO = 42 / 260;
const COUNTDOWN_FONT_RATIO = 38 / 260;
const LABEL_FONT_RATIO = 12 / 260;
const INNER_HINT_FONT_RATIO = 11 / 260;
const LOGO_WIDTH_RATIO = 48 / 260;
const LOGO_ASPECT_RATIO = 31.9 / 72;

const RING_WIDTH = 3;
const PULSE_SCALE = 0.22; // quanto o anel do pulso cresce (22% do diâmetro)

type Visual = {
  base: string; // fundo do círculo
  fill: string; // fatia (pizza) que cresce com o tempo
  ring: string; // borda
  text: string;
  pulse: string | null; // cor do pulso (null = sem pulso)
  pulseDuration: number;
};

function visualFor(phase: PomodoroPhase, isRunning: boolean): Visual {
  if (phase === "idle") {
    return {
      base: Colors.primary,
      fill: Colors.primary,
      ring: Colors.primary,
      text: Colors.background,
      pulse: Colors.primary,
      pulseDuration: 2200,
    };
  }

  const color = phase === "focus" ? Colors.primary : Colors.accent;
  return {
    base: `${color}26`,
    fill: isRunning ? color : `${color}73`,
    ring: color,
    text: Colors.text,
    // Pausado: pulso mais lento, convidando a retomar.
    pulse: isRunning ? null : color,
    pulseDuration: 3000,
  };
}

// Instrução discreta. Parado: dentro do círculo, entre "ACADEX" e o logo.
// Nos outros estados: numa linha abaixo do círculo.
function hintFor(phase: PomodoroPhase, isRunning: boolean): string {
  if (phase === "idle") return "Toque para começar";
  if (isRunning) return "Toque para pausar\nSegure para cancelar";
  return "Toque para retomar\nSegure para cancelar";
}

export default function TimerCircle() {
  const { width, height } = useWindowDimensions();
  const { phase, isRunning, remainingMs, toggle, cancel, celebration } = usePomodoro();
  // Rodada completa: o círculo mostra um check grande (sem pausa) até o
  // usuário tocar em "Continuar" na parabenização.
  const isCelebrating = celebration !== null;
  const { settings } = usePomodoroSettings();

  // Arredondado para um número par de pixels: as duas metades da pizza ficam
  // em posições inteiras e a emenda entre elas não aparece.
  const size =
    Math.round(Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.min(width * 0.66, height * 0.36))) / 2) *
    2;
  const visual = visualFor(phase, isRunning);
  const isIdle = phase === "idle";

  // Fração já cumprida da fase (0 → 1), usada no preenchimento. Se a
  // duração mudou nas configurações no meio da fase, fica limitada a 0..1.
  const duration = durationForPhase(phase, settings);
  const progress = isIdle || duration === 0 ? 0 : Math.min(1, Math.max(0, 1 - remainingMs / duration));

  // --- Preenchimento: anima até o novo valor a cada segundo (sem "degraus").
  const fill = useSharedValue(progress);
  useEffect(() => {
    fill.set(withTiming(progress, { duration: 900, easing: Easing.linear }));
  }, [progress, fill]);

  // Preenchimento em forma de pizza (como um timer de cozinha), sem SVG:
  // duas metades do círculo, cada uma numa "janela" com overflow hidden, e
  // um meio-disco colorido que gira dentro de cada janela.
  //   - 0–180°: o meio-disco da janela direita gira e vai cobrindo a metade
  //     direita a partir das 12h;
  //   - 180–360°: a janela esquerda faz o mesmo, das 6h até as 12h.
  // O conjunto é espelhado (scaleX -1) para a fatia crescer no sentido
  // anti-horário, igual à referência (0 no topo, avançando para a esquerda).
  const rightHalfStyle = useAnimatedStyle(() => ({
    // Passada a metade, quem pinta a metade direita é a própria janela (ver
    // rightWindowStyle); o meio-disco some para a cor não somar duas vezes
    // quando ela é translúcida (estado pausado).
    // Vazia (início da fase): escondido, senão a borda do meio-disco aparece
    // como uma linha fina às 12h.
    opacity: fill.value >= 0.5 || fill.value <= 0.001 ? 0 : 1,
    transform: [{ rotate: `${Math.min(fill.value * 360, 180)}deg` }],
  }));
  const leftHalfStyle = useAnimatedStyle(() => ({
    // Só entra depois da metade (antes disso, a borda dele também riscaria
    // uma linha às 6h).
    opacity: fill.value > 0.5 ? 1 : 0,
    transform: [{ rotate: `${Math.max(fill.value * 360 - 180, 0)}deg` }],
  }));
  // Passada a metade, a janela direita fica inteira colorida: evita a linha
  // fina de anti-aliasing na emenda entre as duas metades.
  const fillColor = visual.fill;
  const rightWindowStyle = useAnimatedStyle(() => ({
    backgroundColor: fill.value >= 0.5 ? fillColor : "transparent",
  }));

  // --- Pulso: dois anéis defasados que crescem e somem, em loop.
  const pulseA = useSharedValue(0);
  const pulseB = useSharedValue(0);
  const pulseColor = isCelebrating ? null : visual.pulse;
  const pulseDuration = visual.pulseDuration;

  useEffect(() => {
    cancelAnimation(pulseA);
    cancelAnimation(pulseB);
    pulseA.set(0);
    pulseB.set(0);
    if (!pulseColor) return;

    const loop = withRepeat(
      withTiming(1, { duration: pulseDuration, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    pulseA.set(loop);
    pulseB.set(withDelay(pulseDuration / 2, loop));
  }, [pulseColor, pulseDuration, pulseA, pulseB]);

  const ringAStyle = useAnimatedStyle(() => ({
    opacity: pulseColor ? 0.45 * (1 - pulseA.value) : 0,
    transform: [{ scale: 1 + PULSE_SCALE * pulseA.value }],
  }));
  const ringBStyle = useAnimatedStyle(() => ({
    opacity: pulseColor ? 0.45 * (1 - pulseB.value) : 0,
    transform: [{ scale: 1 + PULSE_SCALE * pulseB.value }],
  }));

  const handlePress = () => {
    if (isCelebrating) return;
    hapticSelection();
    toggle();
  };

  const handleLongPress = () => {
    if (isIdle) return;
    hapticSelection();
    cancel();
  };

  const circleSize = { width: size, height: size, borderRadius: size / 2 };
  // Diâmetro interno (sem a borda), usado pela pizza.
  const inner = size - RING_WIDTH * 2;
  const logoWidth = size * LOGO_WIDTH_RATIO;
  const label = phase === "idle" ? "" : `${PHASE_LABELS[phase]}${isRunning ? "" : " · pausado"}`;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.stage, { width: size, height: size }]}>
        {/* Anéis do pulso, atrás do círculo. */}
        <Animated.View
          pointerEvents="none"
          style={[styles.pulse, circleSize, { borderColor: pulseColor ?? "transparent" }, ringAStyle]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.pulse, circleSize, { borderColor: pulseColor ?? "transparent" }, ringBStyle]}
        />

        <Pressable
          onPress={handlePress}
          onLongPress={handleLongPress}
          accessibilityRole="button"
          accessibilityLabel={
            isCelebrating
              ? "Rodada concluída"
              : isIdle
                ? "Iniciar foco"
                : `${label}, ${formatCountdown(remainingMs)}`
          }
          accessibilityHint={hintFor(phase, isRunning).replace("\n", ". ")}
          // O tamanho vem do "stage" (View pai), não daqui: o estilo em forma
          // de função do Pressable pode ficar com o tamanho antigo quando a
          // tela muda de tamanho (ex: rotação), e o círculo ficaria menor que
          // o conteúdo calculado para ele.
          style={({ pressed }) => [
            styles.circle,
            { backgroundColor: visual.base, borderColor: visual.ring },
            pressed && styles.circlePressed,
          ]}
        >
          {/* Fatia (pizza) que cresce conforme o tempo passa. */}
          {!isIdle && (
            <View pointerEvents="none" style={[styles.pie, { width: inner, height: inner }]}>
              {/* Janela da metade direita */}
              <Animated.View
                style={[
                  styles.halfWindow,
                  { left: inner / 2, width: inner / 2, height: inner },
                  rightWindowStyle,
                ]}
              >
                <Animated.View
                  style={[styles.disc, { left: -inner / 2, width: inner, height: inner }, rightHalfStyle]}
                >
                  <View style={[styles.halfColor, { left: 0, width: inner / 2, backgroundColor: visual.fill }]} />
                </Animated.View>
              </Animated.View>
              {/* Janela da metade esquerda */}
              <View style={[styles.halfWindow, { left: 0, width: inner / 2, height: inner }]}>
                <Animated.View
                  style={[styles.disc, { left: 0, width: inner, height: inner }, leftHalfStyle]}
                >
                  <View
                    style={[styles.halfColor, { left: inner / 2, width: inner / 2, backgroundColor: visual.fill }]}
                  />
                </Animated.View>
              </View>
            </View>
          )}

          {/* O texto principal (ACADEX ou a contagem) fica exatamente no
              centro; o rótulo da fase e o logo são posicionados em volta dele,
              sem empurrá-lo para cima ou para baixo. */}
          {!isIdle && (
            <Text
              style={[
                styles.label,
                styles.absolute,
                { top: size * 0.27, color: visual.text, fontSize: size * LABEL_FONT_RATIO },
              ]}
            >
              {label}
            </Text>
          )}

          {isCelebrating ? (
            <Animated.View entering={ZoomIn.springify().damping(9)}>
              <Ionicons name="checkmark" size={size * 0.48} color={Colors.text} />
            </Animated.View>
          ) : (
            <Text
              style={[
                isIdle ? styles.brand : styles.countdown,
                {
                  color: visual.text,
                  fontSize: size * (isIdle ? BRAND_FONT_RATIO : COUNTDOWN_FONT_RATIO),
                },
              ]}
            >
              {isIdle ? "ACADEX" : formatCountdown(remainingMs)}
            </Text>
          )}

          {isIdle && !isCelebrating && (
            <Text
              style={[
                styles.innerHint,
                styles.absolute,
                { top: size * 0.63, color: visual.text, fontSize: size * INNER_HINT_FONT_RATIO },
              ]}
            >
              {hintFor(phase, isRunning)}
            </Text>
          )}

          {isIdle && !isCelebrating && (
            <Image
              source={require("../../assets/images/fatec-logo.png")}
              style={[
                styles.absolute,
                {
                  bottom: size * 0.12,
                  width: logoWidth,
                  height: logoWidth * LOGO_ASPECT_RATIO,
                },
              ]}
            />
          )}
        </Pressable>
      </View>

      {/* Altura fixa: a linha existe mesmo vazia (parado), então o círculo
          não "pula" ao trocar de estado. */}
      <Text style={styles.hint}>
        {isIdle ? "" : hintFor(phase, isRunning)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  // Área do círculo; os anéis do pulso crescem para fora dela.
  stage: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: {
    position: "absolute",
    borderWidth: 2,
  },
  circle: {
    width: "100%",
    height: "100%",
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: RING_WIDTH,
    overflow: "hidden",
  },
  circlePressed: {
    transform: [{ scale: 0.96 }],
  },
  // Pizza: ocupa o interior do círculo, espelhada para crescer no sentido
  // anti-horário.
  pie: {
    position: "absolute",
    top: 0,
    left: 0,
    transform: [{ scaleX: -1 }],
  },
  halfWindow: {
    position: "absolute",
    top: 0,
    overflow: "hidden",
  },
  disc: {
    position: "absolute",
    top: 0,
  },
  halfColor: {
    position: "absolute",
    top: 0,
    bottom: 0,
  },
  brand: {
    fontFamily: Fonts.bold,
    includeFontPadding: false,
    letterSpacing: 1,
  },
  countdown: {
    fontFamily: Fonts.bold,
    includeFontPadding: false,
    fontVariant: ["tabular-nums"],
  },
  // Elementos em volta do texto central (centralizados na horizontal).
  absolute: {
    position: "absolute",
    alignSelf: "center",
  },
  label: {
    fontFamily: Fonts.bold,
    includeFontPadding: false,
    letterSpacing: 0.5,
    opacity: 0.9,
  },
  // Bem sutil: é só uma dica, não deve competir com o botão.
  // Duas frases, uma por linha.
  hint: {
    marginTop: 24,
    height: 36,
    lineHeight: 18,
    color: Colors.text,
    fontFamily: Fonts.book,
    fontSize: 12,
    textAlign: "center",
  },
  innerHint: {
    fontFamily: Fonts.book,
    includeFontPadding: false,
    textAlign: "center",
    opacity: 0.6,
  },
});
