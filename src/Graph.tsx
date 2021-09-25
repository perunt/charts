import React from 'react';
import {Text, View, StyleSheet, Dimensions, TouchableWithoutFeedback} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
// import {TouchableWithoutFeedback} from 'react-native-gesture-handler';
import {mixPath, useVector} from 'react-native-redash';

import {GraphIndex, graphs, graphsR, SIZE} from './Model';
import Header from './Header';
import Cursor from './Cursor';

const {width} = Dimensions.get('window');
const AnimatedPath = Animated.createAnimatedComponent(Path);

const SELECTION_WIDTH = width - 32;
const BUTTON_WIDTH = (width - 32) / graphs.length;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  backgroundSelection: {
    backgroundColor: '#f3f3f3',
    ...StyleSheet.absoluteFillObject,
    width: BUTTON_WIDTH,
    borderRadius: 8,
  },
  selection: {
    flexDirection: 'row',
    width: SELECTION_WIDTH,
    alignSelf: 'center',
  },
  labelContainer: {
    padding: 16,
    width: BUTTON_WIDTH,
  },
  label: {
    fontSize: 16,
    color: 'black',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

const Graph = () => {
  const translation = useVector();
  const transition = useSharedValue(0);
  const transitionReverse = useSharedValue(0);
  const previous = useSharedValue<GraphIndex>(0);
  const current = useSharedValue<GraphIndex>(0);
  // const previousReverse = useSharedValue<GraphIndex>(0);
  // const currentReverse = useSharedValue<GraphIndex>(0);
  const animatedProps = useAnimatedProps(() => {
    const previousPath = graphs[previous.value].data.path;
    const currentPath = graphs[current.value].data.path;
    return {
      d: mixPath(transition.value, previousPath, currentPath),
    };
  });
  const animatedPropsReverse = useAnimatedProps(() => {
    const previousPathReverse = graphsR[previous.value].data.path;
    const currentPathReverse = graphsR[current.value].data.path;
    // const previousPathReverse = graphs[previousReverse.value].data.path;
    // const currentPathReverse = graphs[currentReverse.value].data.path;
    return {
      d: mixPath(transition.value, previousPathReverse, currentPathReverse),
    };
  });
  const style = useAnimatedStyle(() => ({
    transform: [{translateX: withTiming(BUTTON_WIDTH * current.value)}],
  }));
  return (
    <View style={styles.container}>
      <View>
        <Svg width={SIZE} height={SIZE}>
          <AnimatedPath
            animatedProps={animatedProps}
            fill="transparent"
            stroke="black"
            strokeWidth={3}
          />
        </Svg>
        <Svg width={SIZE} height={SIZE} style={{position: 'absolute'}}>
          <AnimatedPath
            animatedProps={animatedPropsReverse}
            fill="transparent"
            stroke="black"
            strokeWidth={3}
          />
        </Svg>
        <Cursor translation={translation} index={current} />
      </View>
      <View style={styles.selection}>
        <View style={StyleSheet.absoluteFill}>
          <Animated.View style={[styles.backgroundSelection, style]} />
        </View>
        {graphs.map((graph, index) => {
          return (
            <TouchableWithoutFeedback
              key={graph.label}
              onPress={() => {
                previous.value = current.value;
                transition.value = 0;
                current.value = index as GraphIndex;
                transition.value = withTiming(1);
              }}>
              <Animated.View style={[styles.labelContainer]}>
                <Text style={styles.label}>{graph.label}</Text>
              </Animated.View>
            </TouchableWithoutFeedback>
          );
        })}
      </View>
    </View>
  );
};

export default Graph;
