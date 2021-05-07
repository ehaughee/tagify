import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { router } from '../index';

@customElement('tag-playlist')
export class Playlist extends LitElement {
  @property({type: Object}) location = router.location;

  static get styles() {
    return css``;
  }

  render() {
    return html`
      <p>Playlist id: ${this.location.params.id}</p>
    `;
  }
}