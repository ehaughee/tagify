import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('app-root')
export class AppRoot extends LitElement {
  static get styles() {
    return css``;
  }

  render() {
    return html`
      <a href="/login">Login</a>
      <a href="/playlists">Playlists</a>
      <a href="/playlists/1">Playlist 1</a>
    `;
  }
}
