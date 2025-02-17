/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {RippleInterface} from '@material/mwc-base/utils';
import {html, LitElement, PropertyValues, TemplateResult} from 'lit';
import {property, query, state} from 'lit/decorators';
import {ClassInfo, classMap} from 'lit/directives/class-map';

import {createAnimationSignal, Easing} from '../../motion/animation';

const PRESS_GROW_MS = 450;
const MINIMUM_PRESS_MS = 225;
const INITIAL_ORIGIN_SCALE = 0.2;
const PADDING = 10;
const SOFT_EDGE_MINIMUM_SIZE = 75;
const SOFT_EDGE_CONTAINER_RATIO = 0.35;
const PRESS_PSEUDO = '::after';
const ANIMATION_FILL = 'forwards';

/** @soyCompatible */
export class Ripple extends LitElement implements RippleInterface {
  @query('.md3-ripple-surface') mdRoot!: HTMLElement;

  @property({type: Boolean}) unbounded = false;
  @property({type: Boolean, reflect: true}) disabled = false;

  @state() protected hovered = false;
  @state() protected focused = false;
  @state() protected pressed = false;

  protected leftPos = '';
  protected topPos = '';
  protected rippleSize = '';
  protected rippleScale = '';
  protected initialSize = 0;
  protected pressAnimationSignal = createAnimationSignal();
  protected growAnimation: Animation|null = null;
  protected delayedEndPressHandle: number|null = null;

  /** @soyTemplate */
  protected override render(): TemplateResult {
    return html`<div class="md3-ripple-surface ${
        classMap(this.getRenderRippleClasses())}"></div>`;
  }

  /** @soyTemplate */
  protected getRenderRippleClasses(): ClassInfo {
    return {
      'md3-ripple--hovered': this.hovered,
      'md3-ripple--focused': this.focused,
      'md3-ripple--pressed': this.pressed,
      'md3-ripple--unbounded': this.unbounded,
    };
  }

  protected override update(changedProps: PropertyValues<this>) {
    if (changedProps.has('disabled') && this.disabled) {
      this.endHover();
      this.endFocus();
      this.endPress();
    }
    super.update(changedProps);
  }

  protected getDimensions() {
    return (this.parentElement ?? this).getBoundingClientRect();
  }

  protected determineRippleSize() {
    const {height, width} = this.getDimensions();
    const maxDim = Math.max(height, width);
    const softEdgeSize =
        Math.max(SOFT_EDGE_CONTAINER_RATIO * maxDim, SOFT_EDGE_MINIMUM_SIZE);


    let maxRadius = maxDim;
    let initialSize = Math.floor(maxDim * INITIAL_ORIGIN_SCALE);

    const hypotenuse = Math.sqrt(width ** 2 + height ** 2);
    maxRadius = hypotenuse + PADDING;

    // ensure `initialSize` is even for unbounded
    if (this.unbounded) {
      initialSize = initialSize - (initialSize % 2);
    }

    this.initialSize = initialSize;
    this.rippleScale = `${(maxRadius + softEdgeSize) / initialSize}`;
    this.rippleSize = `${this.initialSize}px`;
  }

  protected getNormalizedEventCoords(positionEvent: Event):
      {x: number, y: number} {
    const {scrollX, scrollY} = window;
    const {left, top} = this.getDimensions();
    const documentX = scrollX + left;
    const documentY = scrollY + top;
    const {pageX, pageY} = (positionEvent as PointerEvent);
    return {x: pageX - documentX, y: pageY - documentY};
  }

  protected getTranslationCoordinates(positionEvent?: Event|null) {
    const {height, width} = this.getDimensions();
    // end in the center
    const endPoint = {
      x: (width - this.initialSize) / 2,
      y: (height - this.initialSize) / 2,
    };

    let startPoint;
    if (positionEvent) {
      startPoint = this.getNormalizedEventCoords(positionEvent);
    } else {
      startPoint = {
        x: width / 2,
        y: height / 2,
      };
    }

    // center around start point
    startPoint = {
      x: startPoint.x - (this.initialSize / 2),
      y: startPoint.y - (this.initialSize / 2),
    };

    return {startPoint, endPoint};
  }

  protected startPressAnimation(positionEvent?: Event|null) {
    this.determineRippleSize();
    const {startPoint, endPoint} =
        this.getTranslationCoordinates(positionEvent);
    const translateStart = `${startPoint.x}px, ${startPoint.y}px`;
    const translateEnd = `${endPoint.x}px, ${endPoint.y}px`;

    const signal = this.pressAnimationSignal.start();

    const growAnimation = this.mdRoot.animate(
        {
          top: [this.topPos, this.topPos],
          left: [this.leftPos, this.leftPos],
          height: [this.rippleSize, this.rippleSize],
          width: [this.rippleSize, this.rippleSize],
          transform: [
            `translate(${translateStart}) scale(1)`,
            `translate(${translateEnd}) scale(${this.rippleScale})`
          ],
        },
        {
          pseudoElement: PRESS_PSEUDO,
          duration: PRESS_GROW_MS,
          easing: Easing.STANDARD,
          fill: ANIMATION_FILL
        });

    growAnimation.addEventListener('finish', () => {
      this.pressAnimationSignal.finish();
      this.growAnimation = null;
    });

    signal.addEventListener('abort', () => {
      growAnimation.cancel();
      this.growAnimation = null;
    });

    this.growAnimation = growAnimation;
  }

  /**
   * @deprecated Use beginHover
   */
  startHover(hoverEvent?: Event) {
    this.beginHover(hoverEvent);
  }

  beginHover(hoverEvent?: Event) {
    if ((hoverEvent as PointerEvent)?.pointerType !== 'touch') {
      this.hovered = true;
    }
  }

  endHover() {
    this.hovered = false;
  }

  /**
   * @deprecated Use beginFocus
   */
  startFocus() {
    this.beginFocus();
  }

  beginFocus() {
    this.focused = true;
  }

  endFocus() {
    this.focused = false;
  }

  /**
   * @deprecated Use beginPress
   */
  startPress(positionEvent?: Event|null) {
    this.beginPress(positionEvent);
  }

  beginPress(positionEvent?: Event|null) {
    this.pressed = true;
    if (this.delayedEndPressHandle !== null) {
      clearTimeout(this.delayedEndPressHandle);
      this.delayedEndPressHandle = null;
    }
    this.startPressAnimation(positionEvent);
  }

  endPress() {
    const pressAnimationPlayState = this.growAnimation?.currentTime ?? Infinity;
    if (pressAnimationPlayState >= MINIMUM_PRESS_MS) {
      this.pressed = false;
    } else {
      this.delayedEndPressHandle = setTimeout(() => {
        this.pressed = false;
        this.delayedEndPressHandle = null;
      }, MINIMUM_PRESS_MS - pressAnimationPlayState);
    }
  }
}