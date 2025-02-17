/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import 'jasmine';

import {html} from 'lit';
import {customElement} from 'lit/decorators';

import {Environment} from '../../testing/environment';
import {State, TemplateBuilder, TemplateProps} from '../../testing/templates';
import {FieldHarness} from '../harness';
import {Field} from '../lib/field';

declare global {
  interface HTMLElementTagNameMap {
    'md-test-field': TestField;
  }
}

@customElement('md-test-field')
class TestField extends Field {
  get isFocused() {
    return this.focused;
  }

  get isFloatingLabelVisibleProp() {
    return this.isFloatingLabelVisible;
  }

  get restingLabelElement() {
    return this.restingLabelEl;
  }

  labelText?: string;

  // Ensure floating/resting labels are rendered
  protected override renderMiddleContents() {
    return html`
      ${this.renderFloatingLabel()}
      ${this.renderRestingLabel()}
      ${super.renderMiddleContents()}
    `;
  }

  override renderLabelText(): string {
    this.labelText = super.renderLabelText();
    return this.labelText;
  }

  override animateLabel() {
    return super.animateLabel();
  }
}

describe('Field', () => {
  const env = new Environment();

  const templates =
      new TemplateBuilder().withHarness(FieldHarness).withVariants({
        field(directive, props) {
          return html`
            <md-test-field
              .label=${props.label}
              .disabled=${props.disabled ?? false}
              .error=${props.error ?? false}
              .populated=${props.populated ?? false}
              .required=${props.required ?? false}
              ${directive}
            >
              <input>
            </md-test-field>
          `;
        },
      });

  async function setupTest(props: TemplateProps<FieldHarness> = {}) {
    // Variant type does not matter for shared tests
    const template = templates.variant('field')(props)(State.DEFAULT);
    const instance = env.render(template).querySelector('md-test-field');
    if (!instance) {
      throw new Error('Could not query rendered <md-test-field>.');
    }

    await env.waitForStability();
    return {
      instance,
      harness: new FieldHarness(instance),
    };
  }

  it('should unfocus field when disabled', async () => {
    // Setup.
    const {instance, harness} = await setupTest();
    await harness.focusWithKeyboard();
    // Test case.
    instance.disabled = true;
    await env.waitForStability();
    // Assertion.
    expect(instance.isFocused)
        .withContext('focused is false after disabled is set to true')
        .toBe(false);
  });

  it('should not allow focus when disabled', async () => {
    // Setup.
    const {instance, harness} = await setupTest({disabled: true});
    await harness.focusWithKeyboard();
    // Test case.
    await env.waitForStability();
    // Assertion.
    expect(instance.isFocused)
        .withContext('focused set back to false when disabled')
        .toBe(false);
  });

  describe('#animateLabel()', () => {
    it('should update visible label type to resting immediately when floating',
       async () => {
         // Setup.
         const {instance, harness} = await setupTest({label: 'Label'});
         // Test case.
         await harness.focusWithKeyboard();
         // Assertion.
         expect(instance.isFloatingLabelVisibleProp)
             .withContext('should display resting label for animation')
             .toBe(false);
       });

    it('should update visible label type to resting immediately when resting',
       async () => {
         // Setup.
         const {instance, harness} = await setupTest({label: 'Label'});
         await harness.focusWithKeyboard();
         // Test case.
         await harness.blur();
         // Assertion.
         expect(instance.isFloatingLabelVisibleProp)
             .withContext('should display resting label for animation')
             .toBe(false);
       });

    it('should update visible label type after floating animation ends',
       async () => {
         // Setup.
         const {instance, harness} = await setupTest({label: 'Label'});
         const animation = new Animation();
         const restingLabel = await instance.restingLabelElement;
         spyOn(restingLabel, 'animate').and.returnValue(animation);
         // Test case.
         await harness.focusWithKeyboard();
         await env.waitForStability();
         animation.play();
         await env.waitForStability();
         // Assertion.
         expect(instance.isFloatingLabelVisibleProp)
             .withContext('visible label should be floating after focusing')
             .toBe(true);
       });

    it('should update visible label type after resting animation ends',
       async () => {
         // Setup.
         const {instance, harness} = await setupTest({label: 'Label'});
         await harness.focusWithKeyboard();
         const animation = new Animation();
         const restingLabel = await instance.restingLabelElement;
         spyOn(restingLabel, 'animate').and.returnValue(animation);
         // Test case.
         await harness.blur();
         await env.waitForStability();
         animation.play();
         await env.waitForStability();
         // Assertion.
         expect(instance.isFloatingLabelVisibleProp)
             .withContext('visible label should be resting after unfocusing')
             .toBe(false);
       });

    it('should animate label when focused changes', async () => {
      // Setup.
      const {instance, harness} = await setupTest({label: 'Label'});
      spyOn(instance, 'animateLabel');
      // Test case.
      await harness.focusWithKeyboard();
      await env.waitForStability();
      // Assertion.
      expect(instance.animateLabel).toHaveBeenCalledTimes(1);
    });

    it('should animate label when populated changes', async () => {
      // Setup.
      const {instance} = await setupTest({label: 'Label'});
      spyOn(instance, 'animateLabel');
      // Test case.
      instance.populated = true;
      await env.waitForStability();
      // Assertion.
      expect(instance.animateLabel).toHaveBeenCalledTimes(1);
    });

    it('should not animate when there is no label', async () => {
      // Setup.
      const {instance, harness} = await setupTest({label: undefined});
      spyOn(instance, 'animateLabel');
      // Test case.
      await harness.focusWithKeyboard();
      await env.waitForStability();
      // Assertion.
      expect(instance.animateLabel)
          .withContext('should not animate label when there is none')
          .not.toHaveBeenCalled();
    });

    it('should still set the visible label type when there is no label',
       async () => {
         // Setup.
         const {instance, harness} = await setupTest({label: undefined});
         await harness.focusWithKeyboard();
         // Test case.
         await env.waitForStability();
         // Assertion.
         expect(instance.isFloatingLabelVisibleProp)
             .withContext(
                 'focusing should still set visible label type to floating')
             .toBe(true);

         // Test case.
         await harness.blur();
         await env.waitForStability();
         // Test case.
         expect(instance.isFloatingLabelVisibleProp)
             .withContext(
                 'unfocusing should still set visible label type to resting')
             .toBe(false);
       });

    it('should not animate if focusing a populated field', async () => {
      // Setup.
      const {instance, harness} =
          await setupTest({label: 'Label', populated: true});
      spyOn(instance, 'animateLabel');
      // Test case.
      await harness.focusWithKeyboard();
      await env.waitForStability();
      // Assertion.
      expect(instance.animateLabel)
          .withContext('should not animate when focusing a populated field')
          .not.toHaveBeenCalled();
    });

    it('should not animate if populating a focused field', async () => {
      // Setup.
      const {instance, harness} = await setupTest({label: 'Label'});
      await harness.focusWithKeyboard();
      spyOn(instance, 'animateLabel');
      // Test case.
      instance.populated = true;
      await env.waitForStability();
      // Assertion.
      expect(instance.animateLabel)
          .withContext('should not animate when populated a focused field')
          .not.toHaveBeenCalled();
    });

    it('should cancel previous animation', async () => {
      // Set up.
      const {instance, harness} = await setupTest({label: 'Label'});
      const restingLabel = await instance.restingLabelElement;
      const firstAnimation = new Animation();
      spyOn(firstAnimation, 'cancel').and.callThrough();
      const secondAnimation = new Animation();
      spyOn(secondAnimation, 'cancel').and.callThrough();
      spyOn(restingLabel, 'animate')
          .and.returnValues(firstAnimation, secondAnimation);
      // Test case.
      await harness.focusWithKeyboard();
      await env.waitForStability();
      await harness.blur();
      await env.waitForStability();
      // Assertion.
      expect(firstAnimation.cancel)
          .withContext('first animation should be cancelled')
          .toHaveBeenCalled();
      expect(secondAnimation.cancel)
          .withContext('second animation should play')
          .not.toHaveBeenCalled();
    });
  });

  describe('.label', () => {
    it('should render empty string when there is no label', async () => {
      // Setup.
      // Test case.
      const {instance} = await setupTest({label: undefined});
      // Assertion.
      expect(instance.labelText)
          .withContext(
              'label text should be empty string if label is not provided')
          .toBe('');
    });

    it('should render label', async () => {
      // Setup.
      // Test case.
      const labelValue = 'Label';
      const {instance} = await setupTest({label: labelValue});
      // Assertion.
      expect(instance.renderLabelText())
          .withContext('label text should equal label when not required')
          .toBe(labelValue);
    });

    it('should adds asterisk if required', async () => {
      // Setup.
      // Test case.
      const labelValue = 'Label';
      const {instance} = await setupTest({required: true, label: labelValue});
      // Assertion.
      expect(instance.renderLabelText())
          .withContext(
              'label text should equal label with asterisk when required')
          .toBe(`${labelValue}*`);
    });

    it('should not render asterisk if required when there is no label',
       async () => {
         // Setup.
         // Test case.
         const {instance} = await setupTest({required: true, label: undefined});
         // Assertion.
         expect(instance.labelText)
             .withContext(
                 'label text should be empty string if label is not provided, even when required')
             .toBe('');
       });
  });
});
