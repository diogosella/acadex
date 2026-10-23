import { Colors, Fonts } from "@/constants/colors";
import { formatCountdown, PHASE_LABELS } from "@/constants/pomodoro-options";
import { usePomodoro } from "@/contexts/pomodoro-context";
import { Image, Pressable, Text, useWindowDimensions, View } from "react-native";

// Proporções extraídas do design original (círculo de 278px), aplicadas de
// forma relativa ao diâmetro atual — assim o botão inteiro (texto, logo e
// espaçamentos) escala junto, em vez de só o círculo crescer/encolher e o
// conteúdo interno ficar desproporcional ou vazar pra fora.
const BASE_SIZE = 278;
const BUTTON_TEXT_MARGIN_TOP_RATIO = 76 / BASE_SIZE;
const TITLE_FONT_SIZE_RATIO = 48 / BASE_SIZE;
const SUBTITLE_FONT_SIZE_RATIO = 20 / BASE_SIZE;
const LOGO_MARGIN_TOP_RATIO = 40 / BASE_SIZE;
const LOGO_WIDTH_RATIO = 72 / BASE_SIZE;
const LOGO_ASPECT_RATIO = 31.9 / 72;

// Limites do diâmetro do círculo: nunca menor que MIN_SIZE (continua
// visível/tocável em celulares pequenos) nem maior que MAX_SIZE (não
// vira um círculo gigante em tablets/telas de desktop no navegador).
const MIN_SIZE = 200;
const MAX_SIZE = 300;

export default function TimerCircle() {
  const { width, height } = useWindowDimensions();
  const { phase, isRunning, remainingMs, toggle, cancel } = usePomodoro();

  // Usa o menor entre uma fração da largura e uma fração da altura da
  // tela, para funcionar tanto em telas estreitas (celular em retrato)
  // quanto em telas baixas (celular em paisagem, janela de navegador
  // redimensionada), sempre dentro do intervalo [MIN_SIZE, MAX_SIZE].
  const size = Math.min(
    MAX_SIZE,
    Math.max(MIN_SIZE, Math.min(width * 0.72, height * 0.4))
  );

  const logoWidth = size * LOGO_WIDTH_RATIO;

  const isIdle = phase === "idle";
  const title = isIdle ? "ACADEX" : formatCountdown(remainingMs);
  const subtitle = isIdle
    ? "Tap to focus."
    : `${PHASE_LABELS[phase]}${isRunning ? "" : " · Pausado"}`;

  return (
    <Pressable
      onPress={toggle}
      onLongPress={cancel}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: Colors.primary,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <View style={{ alignItems: "center", marginTop: size * BUTTON_TEXT_MARGIN_TOP_RATIO }}>
        <Text
          style={{
            color: Colors.background,
            fontSize: size * TITLE_FONT_SIZE_RATIO,
            fontFamily: Fonts.bold,
            includeFontPadding: false,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: Colors.background,
            fontSize: size * SUBTITLE_FONT_SIZE_RATIO,
            includeFontPadding: false,
            fontFamily: Fonts.book,
          }}
        >
          {subtitle}
        </Text>
      </View>

      <Image
        source={require("../../assets/images/fatec-logo.png")}
        style={{
          width: logoWidth,
          height: logoWidth * LOGO_ASPECT_RATIO,
          marginTop: size * LOGO_MARGIN_TOP_RATIO,
        }}
      />
    </Pressable>
  );
}
