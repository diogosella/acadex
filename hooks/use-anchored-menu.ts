import { useCallback, useRef, useState } from "react";
import { LayoutChangeEvent, View } from "react-native";

// Menus/dropdowns "flutuantes" presos a um campo (âncora), que funcionam no
// Android.
//
// O problema que isto resolve: no Android, um elemento com position
// "absolute" que fica FORA dos limites do pai aparece na tela, mas não
// recebe toques — a lista não rolava e as opções não respondiam (era o caso
// de todos os dropdowns pendurados embaixo do campo, dentro da coluna dele).
//
// A solução: o menu é desenhado como filho de um CONTAINER grande (o fundo do
// modal ou a tela inteira), que contém qualquer posição possível. A posição é
// medida com measureLayout entre a âncora e esse container — então o menu
// fica logo abaixo do campo em qualquer tamanho de tela, e abre para cima se
// não couber embaixo.
//
// Uso:
//   const menu = useAnchoredMenu<"cor" | "tipo">({ maxHeight: 220 });
//   <View ref={menu.containerRef} onLayout={menu.onContainerLayout}> ... (o container)
//   <Pressable ref={menu.anchorRef("cor")} onPress={() => menu.toggle("cor")} />
//   <FloatingMenu position={menu.openMenu === "cor" ? menu.position : null}> ...
// O container NÃO deve ter padding (o card usa margem): measureLayout e o
// posicionamento absoluto precisam usar a mesma origem.

export type AnchoredMenuPosition = {
  minWidth: number;
  maxWidth: number; // não passa da borda do container (textos longos truncam)
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
};

type Options = {
  maxHeight: number; // altura máxima do menu (para decidir abrir p/ cima)
  minWidth?: number; // largura mínima do menu
  align?: "left" | "right"; // alinha pela esquerda ou pela direita da âncora
  gap?: number; // distância entre a âncora e o menu
  screenMargin?: number; // folga até a borda do container
};

export function useAnchoredMenu<K extends string>({
  maxHeight,
  minWidth = 150,
  align = "left",
  gap = 4,
  screenMargin = 16,
}: Options) {
  const containerRef = useRef<View>(null);
  const containerSize = useRef({ width: 0, height: 0 });
  const anchors = useRef<Partial<Record<K, View | null>>>({});

  const [openMenu, setOpenMenu] = useState<K | null>(null);
  const [position, setPosition] = useState<AnchoredMenuPosition | null>(null);

  const measure = useCallback(
    (key: K) => {
      const anchor = anchors.current[key];
      const container = containerRef.current;
      if (!anchor || !container) return;

      anchor.measureLayout(container, (x, y, width, height) => {
        const { width: containerWidth, height: containerHeight } = containerSize.current;
        const fitsBelow = y + height + gap + maxHeight <= containerHeight - screenMargin;

        const maxWidth =
          align === "left" ? containerWidth - x - screenMargin : x + width - screenMargin;
        setPosition({
          minWidth: Math.min(Math.max(width, minWidth), maxWidth),
          maxWidth,
          ...(align === "left" ? { left: x } : { right: containerWidth - (x + width) }),
          ...(fitsBelow ? { top: y + height + gap } : { bottom: containerHeight - y + gap }),
        });
      });
    },
    [align, gap, maxHeight, minWidth, screenMargin]
  );

  const close = useCallback(() => {
    setOpenMenu(null);
    setPosition(null);
  }, []);

  const toggle = useCallback(
    (key: K) => {
      if (openMenu === key) {
        close();
        return;
      }
      setOpenMenu(key);
      setPosition(null); // só aparece depois de medido (sem "pulo")
      measure(key);
    },
    [openMenu, close, measure]
  );

  // Ref de callback para cada âncora (o campo que abre o menu).
  const anchorRef = useCallback(
    (key: K) => (node: View | null) => {
      anchors.current[key] = node;
    },
    []
  );

  // Se o layout mudar com um menu aberto (teclado, rotação...), reposiciona.
  const onContainerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      containerSize.current = { width, height };
      if (openMenu) measure(openMenu);
    },
    [openMenu, measure]
  );

  const onContentLayout = useCallback(() => {
    if (openMenu) measure(openMenu);
  }, [openMenu, measure]);

  return {
    containerRef,
    anchorRef,
    openMenu,
    position,
    toggle,
    close,
    onContainerLayout,
    onContentLayout,
  };
}
