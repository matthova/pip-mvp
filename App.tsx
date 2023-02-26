import React from "react";
import { View, StyleSheet, LayoutRectangle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  WithSpringConfig,
  runOnJS,
} from "react-native-reanimated";
import * as SafeArea from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as ScreenOrientation from "expo-screen-orientation";

const spring: WithSpringConfig = {
  damping: 100,
  stiffness: 400,
};
interface PipAndContainerProps {
  snapToCorners?: boolean;
}
function PipAndContainer({ snapToCorners }: PipAndContainerProps) {
  React.useEffect(() => {
    ScreenOrientation.unlockAsync();
  }, []);
  const [start, setStart] = React.useState({ x: 0, y: 0 });
  const startDv = useDerivedValue(() => start, [start]);
  const transX = useSharedValue(start.x);
  const transY = useSharedValue(start.y);
  const dimensions = useSharedValue<LayoutRectangle | null>(null);
  const dimensionsPrev = useSharedValue<LayoutRectangle | null>(null);
  const marginTop = useSharedValue(styles.container.margin);
  const marginBottom = useSharedValue(styles.container.margin);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      transX.value = startDv.value.x + event.translationX;
      transY.value = startDv.value.y + event.translationY;
    })
    .onEnd((event) => {
      if (dimensions.value == null) {
        return;
      }
      const toss = 0.15;
      function clamp(value: number, min: number, max: number) {
        return Math.min(Math.max(value, min), max);
      }
      const width = dimensions.value.width - styles.head.width;
      const targetX = clamp(transX.value + toss * event.velocityX, 0, width);

      const height = dimensions.value.height - styles.head.height;
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
          if (snapToCorners) {
            snapX = left < right ? 0 : width;
          }
          break;
        case bottom:
          snapY = height;
          if (snapToCorners) {
            snapX = left < right ? 0 : width;
          }
          break;
        case left:
          snapX = 0;
          if (snapToCorners) {
            snapY = top < bottom ? 0 : height;
          }
          break;
        case right:
          snapX = width;
          if (snapToCorners) {
            snapY = top < bottom ? 0 : height;
          }
          break;
      }
      transX.value = withSpring(snapX, {
        ...spring,
        velocity: event.velocityX,
      });
      transY.value = withSpring(snapY, {
        ...spring,
        velocity: event.velocityY,
      });
      runOnJS(setStart)({ x: snapX, y: snapY });
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    marginTop.value = withSequence(
      withTiming(marginTop.value),
      withTiming(100, { duration: 300 }),
      withDelay(1000, withTiming(styles.container.margin, { duration: 300 }))
    );
    marginBottom.value = withSequence(
      withTiming(marginBottom.value),
      withTiming(100, { duration: 300 }),
      withDelay(1000, withTiming(styles.container.margin, { duration: 300 }))
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
        dimensionsPrev.value = dimensions.value;
        dimensions.value = e.nativeEvent.layout;
        if (dimensionsPrev.value == null) {
          return;
        }
        const oldWidth = dimensionsPrev.value.width - styles.head.width;
        const newWidth = dimensions.value.width - styles.head.width;
        const newX = start.x * (newWidth / oldWidth);
        const oldHeight = dimensionsPrev.value.height - styles.head.height;
        const newHeight = dimensions.value.height - styles.head.height;
        const newY = start.y * (newHeight / oldHeight);
        transX.value = newX;
        transY.value = newY;
        setStart({ x: newX, y: newY });
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
      <PipAndContainer snapToCorners />
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
      <Main />
    </SafeArea.SafeAreaProvider>
  );
}
export default Providers;
