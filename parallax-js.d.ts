declare module "parallax-js" {
  export type ParallaxOptions = {
    relativeInput?: boolean;
    clipRelativeInput?: boolean;
    hoverOnly?: boolean;
    scalarX?: number;
    scalarY?: number;
    frictionX?: number;
    frictionY?: number;
  };

  export default class Parallax {
    constructor(element: HTMLElement, options?: ParallaxOptions);
    destroy(): void;
  }
}
