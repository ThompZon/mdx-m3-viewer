import MdlxAnimatedObject from '../../../parsers/mdlx/animatedobject';
import MdxModel from './model';
import { Animation } from '../../../parsers/mdlx/animations';
import { Sd, createTypedSd } from './sd';

/**
 * An animation object.
 */
export default class AnimatedObject {
  model: MdxModel;
  animations: Map<string, Sd> = new Map();
  variants: {[key: string]: Uint8Array } = {};

  constructor(model: MdxModel, object: MdlxAnimatedObject) {
    this.model = model;

    for (const animation of object.animations) {
      this.animations.set(animation.name, createTypedSd(model, animation));
    }
  }

  getScalarValue(out: Uint32Array | Float32Array, name: string, sequence: number, frame: number, counter: number, defaultValue: number): number {
    if (sequence !== -1) {
      const animation = this.animations.get(name);

      if (animation) {
        return animation.getValue(out, sequence, frame, counter);
      }
    }

    out[0] = defaultValue;

    return -1;
  }

  getVectorValue(out: Float32Array, name: string, sequence: number, frame: number, counter: number, defaultValue: Float32Array): number {
    if (sequence !== -1) {
      const animation = this.animations.get(name);

      if (animation) {
        return animation.getValue(out, sequence, frame, counter);
      }
    }

    out[0] = defaultValue[0];
    out[1] = defaultValue[1];
    out[2] = defaultValue[2];

    return -1;
  }

  getQuatValue(out: Float32Array, name: string, sequence: number, frame: number, counter: number, defaultValue: Float32Array): number {
    if (sequence !== -1) {
      const animation = this.animations.get(name);

      if (animation) {
        return animation.getValue(out, sequence, frame, counter);
      }
    }

    out[0] = defaultValue[0];
    out[1] = defaultValue[1];
    out[2] = defaultValue[2];
    out[3] = defaultValue[3];

    return -1;
  }

  addVariants(name: string, variantName: string): void {
    const animation = this.animations.get(name);
    const sequences = this.model.sequences.length;
    const variants = new Uint8Array(sequences);

    if (animation) {
      for (let i = 0; i < sequences; i++) {
        if (animation.isVariant(i)) {
          variants[i] = 1;
        }
      }
    }

    this.variants[variantName] = variants;
  }

  addVariantIntersection(names: string[], variantName: string): void {
    const sequences = this.model.sequences.length;
    const variants = new Uint8Array(sequences);

    for (let i = 0; i < sequences; i++) {
      for (const name of names) {
        if (this.variants[name][i]) {
          variants[i] = 1;
        }
      }
    }

    this.variants[variantName] = variants;
  }
}
