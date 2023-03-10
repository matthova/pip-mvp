import React from "react";
import { Dimensions, View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  WithSpringConfig,
  useAnimatedReaction,
} from "react-native-reanimated";
import * as SafeArea from "react-native-safe-area-context";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import * as ScreenOrientation from "expo-screen-orientation";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const spring: WithSpringConfig = {
  damping: 100,
  stiffness: 300,
};
interface PipAndContainerProps {
  snapToCorners?: boolean;
  width: number;
  height: number;
}

function PipAndContainer({
  snapToCorners,
  width,
  height,
}: PipAndContainerProps) {
  const {
    top: offsetTop,
    bottom: offsetBottom,
    left: offsetLeft,
    right: offsetRight,
  } = useSafeAreaInsets();
  const marginTop = useSharedValue(styles.container.margin);
  const marginBottom = useSharedValue(styles.container.margin);
  const destX = useSharedValue(0);
  const transX = useSharedValue(destX.value);
  const destY = useSharedValue(0);
  const transY = useSharedValue(destY.value);

  const windowWidth =
    width -
    offsetLeft -
    offsetRight -
    styles.container.margin * 2 -
    styles.head.width;
  const windowWidthDv = useDerivedValue(() => windowWidth, [windowWidth]);
  const screenHeight = height - offsetTop - offsetBottom - styles.head.height;
  const screenHeightDv = useDerivedValue(() => screenHeight, [screenHeight]);

  const windowHeight = useDerivedValue(
    () =>
      height -
      offsetTop -
      offsetBottom -
      marginTop.value -
      marginBottom.value -
      styles.head.height,
    [height, offsetTop, offsetBottom, marginTop, marginBottom, styles]
  );

  useAnimatedReaction(
    () => {
      return [windowWidth, transX.value];
    },
    (result, previous) => {
      if (previous != null && result[0] !== previous[0]) {
        const newX = (result[1] / previous[0]) * result[0];
        transX.value = newX;
        destX.value = newX;
      }
    },
    [windowWidth]
  );
  useAnimatedReaction(
    () => {
      return [screenHeight - styles.container.margin * 2, transY.value];
    },
    (result, previous) => {
      if (previous != null && result[0] !== previous[0]) {
        const newY = (result[1] / previous[0]) * result[0];
        transY.value = newY;
        destY.value = newY;
      }
    },
    [screenHeight]
  );

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      try {
        transX.value = destX.value + event.translationX;
        transY.value =
          destY.value +
          event.translationY *
          ((screenHeightDv.value - styles.container.margin * 2) /
            windowHeight.value);
      } catch (ex) {
        // startDv may temporarily become undefined with fast refresh
      }
    })
    .onEnd((event) => {
      const toss = 0.15;
      function clamp(value: number, min: number, max: number) {
        return Math.min(Math.max(value, min), max);
      }
      const targetX = clamp(
        transX.value + toss * event.velocityX,
        0,
        windowWidthDv.value
      );

      const tossY = transY.value + toss * event.velocityY;
      const min = marginTop.value - styles.container.margin;
      const yDiff =
        marginTop.value + marginBottom.value - styles.container.margin * 2;
      const max = windowHeight.value + yDiff;
      const targetY = clamp(tossY, min, max);

      const top = targetY;
      const bottom = windowHeight.value + yDiff - targetY;
      const left = targetX;
      const right = windowWidthDv.value - targetX;

      const minDistance = Math.min(top, bottom, left, right);
      let snapX = targetX;
      let snapY = targetY - marginTop.value + styles.container.margin;
      switch (minDistance) {
        case top:
          snapY = 0;
          if (snapToCorners) {
            snapX = left < right ? 0 : windowWidthDv.value;
          }
          break;
        case bottom:
          snapY = bottom + targetY;
          if (snapToCorners) {
            snapX = left < right ? 0 : windowWidthDv.value;
          }
          break;
        case left:
          snapX = 0;
          if (snapToCorners) {
            snapY = top < bottom ? 0 : windowHeight.value + yDiff;
          }
          break;
        case right:
          snapX = windowWidthDv.value;
          if (snapToCorners) {
            snapY = top < bottom ? 0 : windowHeight.value + yDiff;
          }
          break;
      }

      transX.value = withSpring(snapX, {
        ...spring,
        velocity: event.velocityX,
      });
      destX.value = snapX;
      transY.value = withSpring(snapY, {
        ...spring,
        velocity: event.velocityY,
      });
      destY.value = snapY;
    })
    .runOnJS(true); // fixes fast refresh bugs

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      const marginTopBump = 50;
      const marginBottomBump = 100;
      const tapDelayMs = 2000;
      marginTop.value = withSequence(
        withTiming(styles.container.margin),
        withTiming(styles.container.margin + marginTopBump, { duration: 300 }),
        withDelay(
          tapDelayMs,
          withTiming(styles.container.margin, { duration: 300 })
        )
      );

      marginBottom.value = withSequence(
        withTiming(styles.container.margin),
        withTiming(styles.container.margin + marginBottomBump, {
          duration: 300,
        }),
        withDelay(
          tapDelayMs,
          withTiming(styles.container.margin, { duration: 300 })
        )
      );
    })
    .runOnJS(true); // fixes fast refresh bugs

  const gesture = Gesture.Race(panGesture, tapGesture);

  const stylez = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: transX.value,
        },
        {
          translateY:
            transY.value *
            (windowHeight.value /
              (screenHeightDv.value - styles.container.margin * 2)),
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
    <Animated.View style={[styles.container, containerStyles]}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.headContainer, stylez]}>
          <View style={styles.head} />
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

function Main(): React.ReactElement {
  const [width, setWidth] = React.useState(Dimensions.get("screen").width);
  const [height, setHeight] = React.useState(Dimensions.get("screen").height);

  React.useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ screen }) => {
      if (screen.width !== width) {
        setWidth(screen.width);
      }
      if (screen.height !== height) {
        setHeight(screen.height);
      }
    });
    return () => {
      subscription.remove();
    };
  }, [height, width]);

  return (
    <SafeArea.SafeAreaView style={styles.safeArea}>
      <PipAndContainer width={width} height={height} />
    </SafeArea.SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#8888FF",
  },
  container: {
    margin: 50,
    flex: 1,
    backgroundColor: "#FF8888",
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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Main />
      </GestureHandlerRootView>
    </SafeArea.SafeAreaProvider>
  );
}
export default Providers;
