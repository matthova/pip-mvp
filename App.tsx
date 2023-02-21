import React from "react";
import { View, StyleSheet, LayoutRectangle } from "react-native";
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
} from "react-native-reanimated";
import usePrevious from "react-use/esm/usePrevious";
import * as SafeArea from "react-native-safe-area-context";
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from "react-native-gesture-handler";
import * as ScreenOrientation from "expo-screen-orientation";

function ChatHeads() {
  React.useEffect(() => {
    ScreenOrientation.unlockAsync();
  }, []);
  const transX = useSharedValue(0);
  const transY = useSharedValue(0);
  const transXDestination = useSharedValue(0);
  const transYDestination = useSharedValue(0);
  const [dimensions, setDimensions] = React.useState<LayoutRectangle | null>(
    null
  );
  const dimensionsDv = useDerivedValue(() => dimensions, [dimensions]);
  const dimensionsPrev = usePrevious(dimensions);
  console.log("dimensions", dimensions);

  type AnimatedGHContext = {
    startX: number;
    startY: number;
  };

  React.useEffect(() => {
    if (dimensions == null || dimensionsPrev == null) {
      return;
    }

    const oldWidth = dimensionsPrev.width - styles.head.width;
    const newWidth = dimensions.width - styles.head.width;
    const newX = (transXDestination.value / oldWidth) * newWidth;

    const oldHeight = dimensionsPrev.height - styles.head.height;
    const newHeight = dimensions.height - styles.head.height;
    const newY = (transYDestination.value / oldHeight) * newHeight;

    transX.value = withSpring(newX, {
      damping: 200,
      stiffness: 200,
    });
    transXDestination.value = newX;
    transY.value = withSpring(newY, {
      damping: 200,
      stiffness: 200,
    });
    transYDestination.value = newY;
  }, [
    dimensions,
    dimensionsPrev,
    transX,
    transXDestination,
    transY,
    transYDestination,
  ]);

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    AnimatedGHContext
  >({
    onStart: (_, ctx) => {
      ctx.startX = transXDestination.value;
      ctx.startY = transYDestination.value;
    },
    onActive: (event, ctx) => {
      transX.value = ctx.startX + event.translationX;
      transXDestination.value = transX.value;
      transY.value = ctx.startY + event.translationY;
      transYDestination.value = transY.value;
    },
    onEnd: (event) => {
      if (dimensionsDv.value == null) {
        return;
      }
      const toss = 0.1;
      function clamp(value: number, min: number, max: number) {
        return Math.min(Math.max(value, min), max);
      }
      const width = dimensionsDv.value.width - styles.head.width;
      const targetX = clamp(transX.value + toss * event.velocityX, 0, width);

      const height = dimensionsDv.value.height - styles.head.height;
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
      transXDestination.value = snapX;
      transY.value = withSpring(snapY, {
        velocity: event.velocityY,
        damping: 40,
        stiffness: 90,
      });
      transYDestination.value = snapY;
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
    <View
      style={styles.container}
      onLayout={(e) => setDimensions(e.nativeEvent.layout)}
    >
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.headContainer, stylez]}>
          <View style={styles.head} />
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

function Main(): React.ReactElement {
  return (
    <SafeArea.SafeAreaView style={styles.safeArea}>
      <ChatHeads />
    </SafeArea.SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#DDDDFF",
  },
  container: {
    margin: 50,
    flex: 1,
    backgroundColor: "#FFDDDD",
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

function Providers() {
  React.useEffect(() => {
    ScreenOrientation.unlockAsync();
  }, []);

  return (
    <SafeArea.SafeAreaProvider>
      <Main />
    </SafeArea.SafeAreaProvider>
  );
}
export default Providers;
