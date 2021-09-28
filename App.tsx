import {scaleLinear} from 'd3-scale';
import * as shape from 'd3-shape';
import React, {useContext, useEffect, useMemo, useRef, useState} from 'react';
import {Button, Platform, StyleSheet, View} from 'react-native';
import {LongPressGestureHandler} from 'react-native-gesture-handler';
import Animated, {
  runOnUI,
  useAnimatedGestureHandler,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  useWorkletCallback,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {useVector} from 'react-native-redash';
import Svg, {Defs, LinearGradient, Path, Stop} from 'react-native-svg';
import {d3Interpolate} from './d3Interpolate';
import {SIZE} from './src/Model';
import {svgPathProperties} from './svgPathProperties';

interface ChartProps {
  // gestureRef: React.Ref<LongPressGestureHandler>;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

const ChartsStackContext = React.createContext(null);

const CURSOR = 50;

const styles = StyleSheet.create({
  cursor: {
    width: CURSOR,
    height: CURSOR,
    borderRadius: CURSOR / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cursorBody: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: 'red',
  },
});

// shares all the gesture stuff between charts
function ChartsStack({children, width, height}) {
  const isActive = useSharedValue(false);
  const translation = useVector();

  const onGestureEvent = useAnimatedGestureHandler({
    onStart: () => {
      isActive.value = true;
      console.log('start');
    },
    onActive: event => {
      isActive.value = true;
      translation.x.value = event.x < 0 ? 0 : event.x > width ? width : event.x;
      translation.y.value = event.y;
      console.log('active', event.x, event.y);
    },
    onFail: () => {
      isActive.value = false;
    },
    onCancel: () => {
      isActive.value = false;
    },
    onEnd: () => {
      isActive.value = false;
    },
  });

  return (
    <ChartsStackContext.Provider value={{isActive, translation, width, height}}>
      <View style={{width, height}}>
        <LongPressGestureHandler
          {...{onGestureEvent}}
          maxDist={100000}
          minDurationMs={0}
          shouldCancelWhenOutside={false}>
          <Animated.View style={{width, height}}>{children}</Animated.View>
        </LongPressGestureHandler>
      </View>
    </ChartsStackContext.Provider>
  );
}

interface CursorData {
  x: Animated.SharedValue<number>;
  y: Animated.SharedValue<number>;
  isActive: Animated.SharedValue<boolean>;
  strokeColor: string;
}

interface ChartContext extends CursorData {}

const ChartContext = React.createContext<ChartContext>(null);

interface Point {
  x: number;
  y: number;
}

interface ChartProps {
  data: Point[];
  name: string;
  children: React.ReactElement;
  stroke?: string;
}
interface DataPoints {
  // percent_change: number;
  prices: PriceList;
}
type PriceList = {x: number; y: number}[];

const POINTS = 60;

function useUIValue() {
  const idRef = useRef();

  if (!idRef.current) {
    // use some uuid here
    idRef.current = Date.now() + Math.floor(Math.random() * 10000);
  }

  const {current} = idRef;

  return useWorkletCallback(() => {
    'worklet';

    if (!global.remoteValues) {
      global.remoteValues = {};
    }

    return {
      get value() {
        return global.remoteValues[current];
      },
      set value(value) {
        global.remoteValues[current] = value;
      },
    };
  });
}

function Chart({children, data, stroke}: ChartProps) {
  const {isActive, translation, width, height} = useContext(ChartsStackContext);
  // const gestureRef = useRef<LongPressGestureHandler>();

  const interpolatorUI = useUIValue();
  const pathPropertiesUI = useUIValue();

  //////////////////////
  function createPath({data, width, height}) {
    const x = data.map(item => item.x);
    const y = data.map(item => item.y);

    const scaleX = scaleLinear()
      .domain([Math.min(...x), Math.max(...x)])
      .range([0, width]);

    const scaleY = scaleLinear()
      .domain([Math.min(...y), Math.max(...y)])
      .range([height, 0]);

    const path = shape
      .line()
      .x(item => scaleX(item.x))
      .y(item => scaleY(item.y)) // Y position of top line breaks
      // .x(item => scaleX(item.x))
      // .y1(item => scaleY(item.y)) // Y position of top line breaks
      // .y0(height)
      .curve(shape.curveBasis)(data);

    return path;
  }

  const initialPath = useMemo(() => createPath({data, width, height}), []);

  const [paths, setPaths] = useState(() => [initialPath, initialPath]);

  const transition = useSharedValue(0);

  useEffect(() => {
    setPaths(([_, curr]) => [curr, createPath({data, width, height})]);
  }, [data]);

  useEffect(() => {
    runOnUI(() => {
      'worklet';

      transition.value = 0;

      interpolatorUI().value = d3Interpolate().interpolatePath(
        paths[0],
        paths[1],
      );

      pathPropertiesUI().value = svgPathProperties()(paths[1]);

      transition.value = withTiming(1);
    })();
  }, [paths]);

  const x = useSharedValue(0);
  const y = useSharedValue(0);

  useAnimatedReaction(
    () => translation.x.value,
    value => {
      console.log(value);
      if (!pathPropertiesUI().value) {
        return 0;
      }

      const totalLength = pathPropertiesUI().value.getTotalLength();
      const values = pathPropertiesUI().value.getPointAtLength(
        totalLength * (value / width),
      );

      x.value = values.x;
      y.value = values.y;
    },
    [paths],
  );

  const animatedProps = useAnimatedProps(() => {
    const d = interpolatorUI().value
      ? interpolatorUI().value(transition.value)
      : '';

    return {
      d: d,
    };
  }, [paths]);

  const contextValue = useMemo<ChartContext>(
    () => ({
      x,
      y,
      isActive,
      strokeColor: stroke,
    }),
    [],
  );

  const gradientY1Position = Platform.OS === 'android' ? '-700%' : '-130%';

  return (
    <ChartContext.Provider value={contextValue}>
      <Animated.View style={{position: 'absolute', width, height}}>
        <Svg
          viewBox={`-2 -1 ${width} ${height}`}
          width={width - 1}
          height={height}>
          <AnimatedPath
            animatedProps={animatedProps}
            fill="url(#prefix__paint0_linear)"
            stroke={stroke}
            strokeWidth={2}
          />
          <Defs>
            <LinearGradient
              id="prefix__paint0_linear"
              x1="100%"
              y1={gradientY1Position}
              x2="100%"
              y2="120%">
              <Stop stopColor={stroke} />
              <Stop offset="100%" stopColor={'#FFFFFF'} stopOpacity={0} />
            </LinearGradient>
          </Defs>
        </Svg>
      </Animated.View>
      {children}
    </ChartContext.Provider>
  );
}

function useChartData() {
  return useContext(ChartContext);
}

function useCursor(): CursorData {
  const {x, y, isActive, strokeColor} = useChartData();

  return {x, y, isActive, strokeColor};
}

function Cursor({name}) {
  const cursor = useCursor();

  const style = useAnimatedStyle(() => {
    const translateX = cursor.x.value - CURSOR / 2;
    const translateY = cursor.y.value - CURSOR / 2;

    return {
      transform: [
        {translateX},
        {translateY},
        {scale: withSpring(cursor.isActive.value ? 1 : 0)},
      ],
    };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill]}>
      <Animated.View style={[styles.cursor, style]}>
        <View
          style={[styles.cursorBody, {backgroundColor: cursor.strokeColor}]}
        />
      </Animated.View>
    </Animated.View>
  );
}

function Rainbow() {
  const [data, setData] = useState(false);

  function swapData() {
    setData(v => !v);
  }

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: 'white',
          justifyContent: 'center',
          alignItems: 'center',
        },
      ]}>
      <ChartsStack width={SIZE - 50} height={SIZE / 3}>
        <Chart data={data ? data2 : data1} stroke={'red'}>
          <Cursor name="1" />
        </Chart>
        <Chart data={data ? data1 : data3} stroke={'black'}>
          <Cursor name="1" />
        </Chart>
        {/* <Chart data={graph2} stroke={'black'}>
          <Cursor name="2" />
        </Chart> */}
        {/* <Chart data={data2} name="third" stroke={'green'}>
          <Cursor name="2" />
        </Chart> */}
      </ChartsStack>

      <Button title="Swap data" onPress={swapData} />
    </View>
  );
}

export default Rainbow;

