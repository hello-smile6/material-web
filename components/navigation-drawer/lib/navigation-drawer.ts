/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ariaProperty as legacyAriaProperty} from '@material/mwc-base/aria-property';
import {observer} from '@material/mwc-base/observer';
import {html, LitElement, TemplateResult} from 'lit';
import {property} from 'lit/decorators';
import {classMap} from 'lit/directives/class-map';
import {ifDefined} from 'lit/directives/if-defined';

import {ariaProperty} from '../../decorators/aria-property';

/** @soyCompatible */
export class NavigationDrawer extends LitElement {
  /* aria properties */
  /** @soyPrefixAttribute */  // tslint:disable-next-line:no-new-decorators
  @legacyAriaProperty
  @property({type: String, attribute: 'aria-describedby'})
  ariaDescribedBy: string|undefined;

  // tslint:disable-next-line:no-new-decorators
  @ariaProperty
  @property({type: String, attribute: 'data-aria-label', noAccessor: true})
  override ariaLabel: string|undefined;

  // tslint:disable-next-line:no-new-decorators
  @ariaProperty
  @property({attribute: 'data-aria-modal', type: String, noAccessor: true})
  override ariaModal: 'true'|'false' = 'false';

  /** @soyPrefixAttribute */  // tslint:disable-next-line:no-new-decorators
  @legacyAriaProperty
  @property({type: String, attribute: 'aria-labelledby'})
  ariaLabelledBy: string|undefined;

  @property({type: Boolean})  // tslint:disable-next-line:no-new-decorators
  @observer(function(this: NavigationDrawer, value: boolean) {
    setTimeout(() => {
      this.dispatchEvent(new CustomEvent(
          'navigation-drawer-changed',
          {detail: {opened: value}, bubbles: true, composed: true}));
    }, 250);
  })
  opened = false;
  @property({type: String}) pivot: 'start'|'end' = 'end';

  /** @soyTemplate */
  override render(): TemplateResult {
    const ariaExpanded = this.opened ? 'true' : 'false';
    const ariaHidden = !this.opened ? 'true' : 'false';

    return html`
      <div
        aria-describedby="${ifDefined(this.ariaDescribedBy)}"
        aria-expanded="${ariaExpanded}"
        aria-hidden="${ariaHidden}"
        aria-label="${ifDefined(this.ariaLabel)}"
        aria-labelledby="${ifDefined(this.ariaLabelledBy)}"
        aria-modal="${this.ariaModal}"
        class="md3-navigation-drawer ${this.getRenderClasses()}"
        role="dialog"><div class="md3-elevation-overlay"
        ></div>
        <div class="md3-navigation-drawer__slot-content">
          <slot></slot>
        </div>
      </div>
    `;
  }

  /** @soyTemplate classMap */
  protected getRenderClasses() {
    return classMap({
      'md3-navigation-drawer--opened': this.opened,
      'md3-navigation-drawer--pivot-at-start': this.pivot === 'start',
    });
  }
}
