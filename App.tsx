import React from "react";
import { View, Dimensions, StyleSheet, ScaledSize } from "react-native";
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
} from "react-native-reanimated";
import * as SafeArea from "react-native-safe-area-context";
import * as ScreenOrientation from "expo-screen-orientation";
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from "react-native-gesture-handler";

function ChatHeads({
  children,
}: React.PropsWithChildren<Record<never, never>>) {
  const [windowWidth, setWindowWidth] = React.useState(
    Dimensions.get("window").width
  );
  const [windowHeight, setWindowHeight] = React.useState(
    Dimensions.get("window").height
  );
  const [orientation, setOrientation] = React.useState(
    ScreenOrientation.Orientation.PORTRAIT_UP
  );

  React.useEffect(() => {
    function updateOrientation(
      event: ScreenOrientation.OrientationChangeEvent
    ) {
      setOrientation(event.orientationInfo.orientation);
    }
    const subscription =
      ScreenOrientation.addOrientationChangeListener(updateOrientation);
    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription);
    };
  });
  const transX = useSharedValue(0);
  const transY = useSharedValue(0);
  const {
    top: topOffset,
    bottom: bottomOffset,
    left: leftOffset,
    right: rightOffset,
  } = SafeArea.useSafeAreaInsets();

  type AnimatedGHContext = {
    startX: number;
    startY: number;
  };

  React.useEffect(() => {
    function handleDimensionChange({
      window,
      screen: _screen,
    }: {
      window: ScaledSize;
      screen: ScaledSize;
    }) {
      if (window.width !== windowWidth) {
        setWindowWidth(window.width);
        transX.value = 0; // TODO
      }
      if (window.height !== windowHeight) {
        setWindowHeight(window.height);
        transY.value = 0; // TODO
      }
    }
    Dimensions.addEventListener("change", handleDimensionChange);
    // No remove event listener?
  }, [transX, transY, windowHeight, windowWidth]);

  const windowWidthDv = useDerivedValue(() => windowWidth, [windowWidth]);
  const windowHeightDv = useDerivedValue(() => windowHeight, [windowHeight]);
  const topOffsetDv = useDerivedValue(() => topOffset, [topOffset]);
  const bottomOffsetDv = useDerivedValue(() => bottomOffset, [bottomOffset]);
  const leftOffsetDv = useDerivedValue(() => leftOffset, [leftOffset]);
  const rightOffsetDv = useDerivedValue(() => rightOffset, [rightOffset]);

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    AnimatedGHContext
  >({
    onStart: (_, ctx) => {
      ctx.startX = transX.value;
      ctx.startY = transY.value;
    },
    onActive: (event, ctx) => {
      transX.value = ctx.startX + event.translationX;
      transY.value = ctx.startY + event.translationY;
    },
    onEnd: (event) => {
      const width =
        windowWidthDv.value -
        // This is hacky and wrong
        (orientation === ScreenOrientation.Orientation.PORTRAIT_UP
          ? leftOffsetDv.value + rightOffsetDv.value
          : topOffsetDv.value + bottomOffsetDv.value) -
        styles.container.margin * 2 -
        styles.head.height; // minus margins & width
      const height =
        windowHeightDv.value -
        // This is hacky and wrong
        (orientation === ScreenOrientation.Orientation.PORTRAIT_UP
          ? topOffsetDv.value + bottomOffsetDv.value
          : leftOffsetDv.value + rightOffsetDv.value) -
        styles.container.margin * 2;
      const toss = 0.1;
      function clamp(value: number, min: number, max: number) {
        return Math.min(Math.max(value, min), max);
      }
      const targetX = clamp(transX.value + toss * event.velocityX, 0, width);
      const targetY = clamp(transY.value + toss * event.velocityY, 0, height);

      const top = targetY;
      const bottom = height - targetY;
      const left = targetX;
      const right = width - targetX;
      const minDistance = Math.min(top, bottom, left, right);
      let snapX = targetX;
      let snapY = targetY;
      switch (minDistance) {
        case top:
          snapY = 0;
          snapX = left < right ? 0 : width;
          break;
        case bottom:
          snapY = height;
          snapX = left < right ? 0 : width;
          break;
        case left:
          snapX = 0;
          snapY = top < bottom ? 0 : height;
          break;
        case right:
          snapX = width;
          snapY = top < bottom ? 0 : height;
          break;
      }
      transX.value = withSpring(snapX, {
        velocity: event.velocityX,
        damping: 40,
        stiffness: 90,
      });
      transY.value = withSpring(snapY, {
        velocity: event.velocityY,
        damping: 40,
        stiffness: 90,
      });
    },
  });

  const stylez = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: transX.value,
        },
        {
          translateY: transY.value,
        },
      ],
    };
  });

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.headContainer, stylez]}>
        {children}
      </Animated.View>
    </PanGestureHandler>
  );
}

function Main(): React.ReactElement {
  return (
    <SafeArea.SafeAreaProvider>
      <View style={styles.container}>
        <ChatHeads>
          <View style={styles.head} />
        </ChatHeads>
      </View>
    </SafeArea.SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 50,
    flex: 1,
    borderWidth: 1,
    borderColor: "pink",
  },
  head: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "black",
  },
  headContainer: {
    position: "absolute",
  },
});

export default Main;
