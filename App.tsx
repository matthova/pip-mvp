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
  runOnJS,
  cancelAnimation,
  interpolate,
} from "react-native-reanimated";
import * as SafeArea from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as ScreenOrientation from "expo-screen-orientation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import usePrevious from "react-use/esm/usePrevious";

const spring: WithSpringConfig = {
  damping: 100,
  stiffness: 300,
};
interface PipAndContainerProps {
  orientation: ScreenOrientation.Orientation;
  snapToCorners?: boolean;
}
function PipAndContainer({ orientation, snapToCorners }: PipAndContainerProps) {
  const { width, height } = Dimensions.get("window");
  const {
    top: offsetTop,
    bottom: offsetBottom,
    left: offsetLeft,
    right: offsetRight,
  } = useSafeAreaInsets();

  const marginTop = useSharedValue(styles.container.margin);
  const marginTopDestination = useSharedValue(styles.container.margin);
  const marginBottom = useSharedValue(styles.container.margin);
  const marginBottomDestination = useSharedValue(styles.container.margin);
  const destX = useSharedValue(0);
  const destY = useSharedValue(0);
  const transX = useSharedValue(destX.value);
  const transY = useSharedValue(destY.value);

  const windowWidthDestination = useSharedValue(
    width -
    offsetLeft -
    offsetRight -
    styles.container.margin * 2 -
    styles.head.width
  );
  const windowWidth = useDerivedValue(
    () => windowWidthDestination.value,
    [windowWidthDestination]
  );

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

  const windowHeightDestination = useDerivedValue(
    () =>
      height -
      offsetTop -
      offsetBottom -
      marginTopDestination.value -
      marginBottomDestination.value -
      styles.head.height,
    [height, offsetTop, offsetBottom, marginTop, marginBottom, styles]
  );

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      try {
        transX.value = destX.value + event.translationX;
        transY.value = destY.value + event.translationY;
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
        windowWidth.value
      );

      console.log("clamped", windowHeight.value);
      const targetY = clamp(
        transY.value + toss * event.velocityY,
        0,
        windowHeight.value
      );

      const top = targetY;
      const bottom = windowHeight.value - targetY;
      const left = targetX;
      const right = windowWidth.value - targetX;

      const minDistance = Math.min(top, bottom, left, right);
      let snapX = targetX;
      let snapY = targetY;
      switch (minDistance) {
        case top:
          snapY = 0;
          if (snapToCorners) {
            snapX = left < right ? 0 : windowWidth.value;
          }
          break;
        case bottom:
          snapY = windowHeight.value;
          if (snapToCorners) {
            snapX = left < right ? 0 : windowWidth.value;
          }
          break;
        case left:
          snapX = 0;
          if (snapToCorners) {
            snapY = top < bottom ? 0 : windowHeight.value;
          }
          break;
        case right:
          snapX = windowWidth.value;
          if (snapToCorners) {
            snapY = top < bottom ? 0 : windowHeight.value;
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
      marginTop.value = withSequence(
        withTiming(styles.container.margin),
        withTiming(styles.container.margin + marginTopBump, { duration: 300 }),
        withDelay(2000, withTiming(styles.container.margin, { duration: 300 }))
      );
      marginTopDestination.value = withDelay(
        2000,
        withTiming(styles.container.margin, { duration: 0 })
      );

      marginBottom.value = withSequence(
        withTiming(styles.container.margin),
        withTiming(styles.container.margin + marginBottomBump, {
          duration: 300,
        }),
        withDelay(2000, withTiming(styles.container.margin, { duration: 300 }))
      );
      marginBottomDestination.value = withDelay(
        2000,
        withTiming(styles.container.margin, { duration: 0 })
      );
    })
    .runOnJS(true); // fixes fast refresh bugs

  const gesture = Gesture.Race(panGesture, tapGesture);

  const stylez = useAnimatedStyle(() => {
    const translateY =
      transY.value * (windowHeight.value / windowHeightDestination.value);
    console.log("translateY", translateY, transY.value);
    return {
      transform: [
        {
          translateX: transX.value,
        },
        {
          translateY,
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
  const [orientation, setOrientation] =
    React.useState<ScreenOrientation.Orientation>(
      ScreenOrientation.Orientation.PORTRAIT_UP
    );

  React.useEffect(() => {
    const updateSubscription = ScreenOrientation.addOrientationChangeListener(
      (e) => {
        setOrientation(e.orientationInfo.orientation);
      }
    );
    return () => {
      updateSubscription.remove();
    };
  }, []);

  return (
    <SafeArea.SafeAreaView style={styles.safeArea}>
      <PipAndContainer orientation={orientation} />
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
