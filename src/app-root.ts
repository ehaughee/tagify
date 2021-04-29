import { LitElement, html, css } from 'lit';
import { property, customElement } from 'lit/decorators.js';

@customElement('app-root')
export class AppRoot extends LitElement {
  static get styles() {
    return css``;
  }

  render() {
    return html`
      <p>access_token: "${this.getHashValueByKey('access_token')}"</p>
      <a href="/login">Login</a>
    `;
  }

  private getHashValueByKey(key: string) {
    const hash = window.location.hash;
    const hashKeyValuePairs = hash.slice(1).split('&').reduce((accum: { [key: string]: string }, kvp) => {
      const kvpArray = kvp.split('=');
      accum[kvpArray[0]] = kvpArray[1];
      return accum;
    }, {});
    return hashKeyValuePairs?.[key];
  }
}
