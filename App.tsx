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
  const {
    top: offsetTop,
    bottom: offsetBottom,
    left: offsetLeft,
    right: offsetRight,
  } = useSafeAreaInsets();

  const [start, setStart] = React.useState({ x: 0, y: 0 });
  const startDv = useDerivedValue(() => start, [start]);

  const marginTop = useSharedValue(styles.container.margin);
  const marginBottom = useSharedValue(styles.container.margin);
  const transX = useSharedValue(start.x);
  const transY = useSharedValue(start.y);

  const { width, height } = Dimensions.get("window");
  const windowWidth =
    width -
    offsetLeft -
    offsetRight -
    styles.container.margin * 2 -
    styles.head.width;
  const windowWidthPrev = usePrevious(windowWidth);
  const windowWidthDv = useDerivedValue(() => windowWidth, [windowWidth]);

  const windowHeight =
    height -
    offsetTop -
    offsetBottom -
    marginTop.value -
    marginBottom.value -
    styles.head.height;

  const windowHeightPrev = usePrevious(windowHeight);
  const windowHeightDv = useDerivedValue(() => windowHeight, [windowHeight]);

  React.useEffect(() => {
    if (windowWidthPrev === undefined || windowHeightPrev === undefined) {
      return;
    }
    const newX = start.x * (windowWidth / windowWidthPrev);
    const newY = start.y * (windowHeight / windowHeightPrev);
    transX.value = newX;
    transY.value = newY;
    const newState = { x: newX, y: newY };
    if (newState.x !== start.x || newState.y !== start.y) {
      setStart(newState);
    }
  }, [
    start,
    transX,
    transY,
    windowHeight,
    windowHeightPrev,
    windowWidth,
    windowWidthPrev,
    orientation,
  ]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      try {
        transX.value = startDv.value.x + event.translationX;
        transY.value = startDv.value.y + event.translationY;
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

      const targetY = clamp(
        transY.value + toss * event.velocityY,
        0,
        windowHeightDv.value
      );

      const top = targetY;
      const bottom = windowHeightDv.value - targetY;
      const left = targetX;
      const right = windowWidthDv.value - targetX;

      const minDistance = Math.min(top, bottom, left, right);
      let snapX = targetX;
      let snapY = targetY;
      switch (minDistance) {
        case top:
          snapY = 0;
          if (snapToCorners) {
            snapX = left < right ? 0 : windowWidthDv.value;
          }
          break;
        case bottom:
          snapY = windowHeightDv.value;
          if (snapToCorners) {
            snapX = left < right ? 0 : windowWidthDv.value;
          }
          break;
        case left:
          snapX = 0;
          if (snapToCorners) {
            snapY = top < bottom ? 0 : windowHeightDv.value;
          }
          break;
        case right:
          snapX = windowWidthDv.value;
          if (snapToCorners) {
            snapY = top < bottom ? 0 : windowHeightDv.value;
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
    })
    .runOnJS(true); // fixes fast refresh bugs

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
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
      const initialY = transY.value;
      transY.value = withSequence(
        withTiming(initialY),
        withTiming(
          transY.value *
          ((windowHeightDv.value - marginBottom.value - marginTop.value) /
            windowHeightDv.value),
          { duration: 300 }
        ),
        withDelay(1000, withTiming(initialY, { duration: 300 }))
      );
    })
    .runOnJS(true);

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
      <PipAndContainer orientation={orientation} snapToCorners />
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
