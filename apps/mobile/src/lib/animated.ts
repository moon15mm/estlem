import { Animated, ScrollView, View } from 'react-native';

type Chainable = {
  duration: (value: number) => Chainable;
  delay: (value: number) => Chainable;
  springify: () => Chainable;
};

const chainable: Chainable = {
  duration: () => chainable,
  delay: () => chainable,
  springify: () => chainable,
};

type AnimatedComponent = React.ComponentType<any>;

const AnimatedShim = {
  View: View as AnimatedComponent,
  ScrollView: ScrollView as AnimatedComponent,
  createAnimatedComponent: <T,>(component: T) => component as T & AnimatedComponent,
};

export const FadeIn = chainable;
export const FadeInDown = chainable;
export const FadeInRight = chainable;
export const FadeInUp = chainable;
export const SlideInDown = chainable;
export const useSharedValue = <T,>(value: T) => ({ value });
export const useAnimatedStyle = (factory?: () => Record<string, unknown>) => (factory ? factory() : {});
export const withSpring = <T,>(value: T) => value;
export const withSequence = <T,>(...values: T[]) => values[values.length - 1];

export default AnimatedShim;
