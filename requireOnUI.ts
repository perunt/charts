import {d3Interpolate} from './d3Interpolate';

function requireOrAdd(name, module) {
  'worklet';

  if (!global.__reanimatedUIModulesMap) {
    global.__reanimatedUIModulesMap = {};
  }

  if (!global.__reanimatedUIModulesMap[name]) {
    global.__reanimatedUIModulesMap[name] = module();
  }

  return global.__reanimatedUIModulesMap[name];
}

export function requireOnWorklet(name) {
  'worklet';

  // can be codegened
  switch (name) {
    case 'd3-interpolate-path':
      return requireOrAdd(name, d3Interpolate);
    default:
      throw new Error(`Cannot resolve UI module with a name ${name}`);
  }
}
