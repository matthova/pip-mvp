import React from "react";
import { View, StyleSheet, LayoutRectangle } from "react-native";
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import usePrevious from "react-use/esm/usePrevious";
import * as SafeArea from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as ScreenOrientation from "expo-screen-orientation";

function ChatHeads() {
  React.useEffect(() => {
    ScreenOrientation.unlockAsync();
  }, []);
  const transX = useSharedValue(0);
  const transY = useSharedValue(0);
  const start = useSharedValue({ x: 0, y: 0 });
  const [dimensions, setDimensions] = React.useState<LayoutRectangle | null>(
    null
  );
  const marginTop = useSharedValue(styles.container.margin);
  const marginBottom = useSharedValue(styles.container.margin);

  const dimensionsDv = useDerivedValue(() => dimensions, [dimensions]);
  const dimensionsPrev = usePrevious(dimensions);

  React.useEffect(() => {
    if (dimensions == null || dimensionsPrev == null) {
      return;
    }

    const oldWidth = dimensionsPrev.width - styles.head.width;
    const newWidth = dimensions.width - styles.head.width;
    const newX = (start.value.x / oldWidth) * newWidth;

    const oldHeight = dimensionsPrev.height - styles.head.height;
    const newHeight = dimensions.height - styles.head.height;
    const newY = (start.value.y / oldHeight) * newHeight;

    transX.value = newX;
    transY.value = newY;
    start.value = { x: newX, y: newY };
  }, [dimensions, dimensionsPrev, start, transX, transY]);

  const panGesture = Gesture.Pan()
    .onStart((e) => {
      console.log("start", start.value);
    })
    .onUpdate((event) => {
      transX.value = start.value.x + event.translationX;
      transY.value = start.value.y + event.translationY;
    })
    .onEnd((event) => {
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
      transY.value = withSpring(snapY, {
        velocity: event.velocityY,
        damping: 40,
        stiffness: 90,
      });
      start.value = { x: snapX, y: snapY };
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    marginTop.value = withSequence(
      withTiming(marginTop.value),
      withTiming(100, { duration: 300 }),
      withDelay(3000, withTiming(styles.container.margin, { duration: 300 }))
    );
    marginBottom.value = withSequence(
      withTiming(marginBottom.value),
      withTiming(100, { duration: 300 }),
      withDelay(3000, withTiming(styles.container.margin, { duration: 300 }))
    );
  });

  const gesture = Gesture.Race(panGesture, tapGesture);

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

  const containerStyles = useAnimatedStyle(() => {
    return {
      marginTop: marginTop.value,
      marginBottom: marginBottom.value,
    };
  });

  return (
    <Animated.View
      style={[styles.container, containerStyles]}
      onLayout={(e) => {
        console.log("e dang");
        setDimensions(e.nativeEvent.layout);
      }}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.headContainer, stylez]}>
          <View style={styles.head} />
        </Animated.View>
      </GestureDetector>
    </Animated.View>
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
