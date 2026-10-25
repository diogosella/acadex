import { Colors, Fonts } from "@/constants/colors";
import { hapticSelection } from "@/lib/haptics";
import { Tabs } from "expo-router";
import { ComponentProps, ReactNode, useEffect, useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

// Tipo das props do tabBar tirado do próprio <Tabs> do expo-router (no SDK
// 56+ não se importa nada de "@react-navigation/*" direto).
type AppTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

// Barra flutuante com "recorte": a aba ativa ganha um círculo vermelho
// elevado acima da barra, dentro de um entalhe curvo, com o ícone subindo
// para dentro do círculo e o nome em negrito. Ao trocar de aba, círculo e
// entalhe deslizam até a nova posição.
//
// Como o entalhe é desenhado (sem SVG, só Views):
//   - um anel na cor do FUNDO da tela, centrado na borda de cima da barra,
//     "come" um semicírculo da barra → parece um recorte;
//   - dois "ombros" (cantos arredondados) suavizam a passagem da borda de
//     cima da barra para dentro do recorte;
//   - anel e ombros ficam dentro da barra com overflow hidden, então nunca
//     vazam para fora das bordas arredondadas dela.
// Por isso o fundo em volta da barra precisa ser Colors.background (é a
// cor das telas), senão o recorte apareceria com outra cor.

const BAR_HEIGHT = 64;
const BAR_RADIUS = 22;
const BAR_PADDING_X = 8;
const CIRCLE_SIZE = 52;
const NOTCH_GAP = 6; // espaço entre o círculo e a borda do recorte
const SHOULDER = 12; // raio da curva que suaviza a entrada do recorte
const TOP_SPACE = CIRCLE_SIZE / 2 + 4; // área acima da barra para o círculo
const ICON_SIZE = 22;
const ICON_TOP = 12; // posição do ícone (inativo) dentro da barra
const ICON_LIFT = ICON_TOP + ICON_SIZE / 2; // sobe até o centro do círculo

const RING_SIZE = CIRCLE_SIZE + NOTCH_GAP * 2;
const INDICATOR_WIDTH = RING_SIZE + SHOULDER * 2;
// O anel não é vertical na altura em que o ombro termina: ele já "entrou"
// um pouco. Os ombros são deslocados esse tanto para dentro, para a curva
// encostar exatamente na borda do recorte (sem um degrau de 1–2 px).
const RING_RADIUS = RING_SIZE / 2;
const SHOULDER_INSET = RING_RADIUS - Math.sqrt(RING_RADIUS ** 2 - SHOULDER ** 2);

const ACTIVE_COLOR = Colors.text;
const INACTIVE_COLOR = "#A9ABAE";
const MOVE_ANIMATION = { duration: 320, easing: Easing.out(Easing.cubic) };
const LIFT_ANIMATION = { duration: 260, easing: Easing.out(Easing.cubic) };

export default function AppTabBar({ state, descriptors, navigation, insets }: AppTabBarProps) {
  const [barWidth, setBarWidth] = useState(0);

  // Abas escondidas com `href: null` (ex: a rota index, que só redireciona)
  // chegam com display "none" e não entram na barra.
  const visibleRoutes = state.routes.filter(
    (route) =>
      StyleSheet.flatten(descriptors[route.key].options.tabBarItemStyle)?.display !== "none"
  );
  const activeKey = state.routes[state.index]?.key;
  const activeIndex = Math.max(
    0,
    visibleRoutes.findIndex((route) => route.key === activeKey)
  );

  const itemWidth =
    visibleRoutes.length > 0 ? (barWidth - BAR_PADDING_X * 2) / visibleRoutes.length : 0;
  const activeCenterX = BAR_PADDING_X + itemWidth * (activeIndex + 0.5);

  // Centro (x) do círculo/entalhe, animado no thread de UI. -1 = ainda não
  // medido (indicador escondido).
  const indicatorX = useSharedValue(-1);

  useEffect(() => {
    if (barWidth === 0) return;
    // Primeira medição: posiciona sem animar. Depois: desliza.
    if (indicatorX.get() < 0) {
      indicatorX.set(activeCenterX);
    } else {
      indicatorX.set(withTiming(activeCenterX, MOVE_ANIMATION));
    }
  }, [activeCenterX, barWidth, indicatorX]);

  const notchStyle = useAnimatedStyle(() => ({
    opacity: indicatorX.value < 0 ? 0 : 1,
    transform: [{ translateX: Math.round(indicatorX.value - INDICATOR_WIDTH / 2) }],
  }));

  const circleStyle = useAnimatedStyle(() => ({
    opacity: indicatorX.value < 0 ? 0 : 1,
    transform: [{ translateX: Math.round(indicatorX.value - CIRCLE_SIZE / 2) }],
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) + 4 }]}>
      <View style={styles.barArea} onLayout={handleLayout}>
        {/* Barra + entalhe (recortado pela própria barra). */}
        <View style={styles.bar}>
          <Animated.View style={[styles.notch, notchStyle]}>
            <View style={[styles.shoulder, styles.shoulderLeft]}>
              <View style={[styles.shoulderFill, styles.shoulderFillLeft]} />
            </View>
            <View style={[styles.shoulder, styles.shoulderRight]}>
              <View style={[styles.shoulderFill, styles.shoulderFillRight]} />
            </View>
            {/* Anel por último: cobre a parte dos ombros que sobrepõe. */}
            <View style={styles.ring} />
          </Animated.View>
        </View>

        {/* Círculo vermelho elevado. */}
        <Animated.View pointerEvents="none" style={[styles.circle, circleStyle]} />

        {/* Itens por último (desenhados por cima de tudo), para o ícone
            ativo ficar dentro do círculo. Sem elevation aqui: no Android
            ela desenha sombra e muda a ordem de desenho. */}
        <View style={styles.items}>
          {visibleRoutes.map((route) => {
            const { options } = descriptors[route.key];
            const focused = route.key === activeKey;
            const label = typeof options.title === "string" ? options.title : route.name;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented) {
                hapticSelection();
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({ type: "tabLongPress", target: route.key });
            };

            return (
              <TabItem
                key={route.key}
                label={label}
                focused={focused}
                onPress={onPress}
                onLongPress={onLongPress}
                renderIcon={(color) =>
                  options.tabBarIcon?.({ focused, color, size: ICON_SIZE }) ?? null
                }
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

type TabItemProps = {
  label: string;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  renderIcon: (color: string) => ReactNode;
};

function TabItem({ label, focused, onPress, onLongPress, renderIcon }: TabItemProps) {
  // 0 = inativa, 1 = ativa: o ícone sobe até o centro do círculo.
  const lift = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    lift.set(withTiming(focused ? 1 : 0, LIFT_ANIMATION));
  }, [focused, lift]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -ICON_LIFT * lift.value }],
  }));

  const color = focused ? ACTIVE_COLOR : INACTIVE_COLOR;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.item, pressed && !focused && styles.itemPressed]}
    >
      <Animated.View style={[styles.icon, iconStyle]}>{renderIcon(color)}</Animated.View>
      <Text
        style={[styles.label, { color }, focused && styles.labelActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Fundo em volta da barra flutuante: mesma cor das telas (ver comentário
  // do topo: é ela que aparece dentro do recorte).
  wrapper: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
  },
  barArea: {
    height: TOP_SPACE + BAR_HEIGHT,
  },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: BAR_HEIGHT,
    borderRadius: BAR_RADIUS,
    backgroundColor: Colors.surface,
    overflow: "hidden",
  },
  // Grupo que desliza: ombro esquerdo + anel + ombro direito, alinhados
  // pela borda de cima da barra.
  notch: {
    position: "absolute",
    top: 0,
    left: 0,
    width: INDICATOR_WIDTH,
    height: RING_RADIUS,
  },
  ring: {
    position: "absolute",
    left: SHOULDER,
    top: -RING_RADIUS, // centro na borda de cima da barra
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_RADIUS,
    backgroundColor: Colors.background,
  },
  // Cada ombro: quadrado na cor do fundo com um quadrado da cor da barra
  // por cima, arredondado no canto que encosta no recorte → curva suave.
  shoulder: {
    position: "absolute",
    top: 0,
    width: SHOULDER,
    height: SHOULDER,
    backgroundColor: Colors.background,
  },
  shoulderLeft: {
    left: SHOULDER_INSET,
  },
  shoulderRight: {
    left: SHOULDER + RING_SIZE - SHOULDER_INSET,
  },
  shoulderFill: {
    width: SHOULDER,
    height: SHOULDER,
    backgroundColor: Colors.surface,
  },
  shoulderFillLeft: {
    borderTopRightRadius: SHOULDER,
  },
  shoulderFillRight: {
    borderTopLeftRadius: SHOULDER,
  },
  circle: {
    position: "absolute",
    top: TOP_SPACE - CIRCLE_SIZE / 2,
    left: 0,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: Colors.primary,
  },
  items: {
    position: "absolute",
    left: BAR_PADDING_X,
    right: BAR_PADDING_X,
    bottom: 0,
    height: BAR_HEIGHT,
    flexDirection: "row",
  },
  item: {
    flex: 1,
    alignItems: "center",
  },
  itemPressed: {
    opacity: 0.6,
  },
  icon: {
    marginTop: ICON_TOP,
    height: ICON_SIZE,
    justifyContent: "center",
  },
  label: {
    marginTop: 6,
    fontFamily: Fonts.book,
    fontSize: 11,
  },
  labelActive: {
    fontFamily: Fonts.bold,
  },
});
