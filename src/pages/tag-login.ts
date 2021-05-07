import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('tag-login')
export class AppRoot extends LitElement {
  private readonly clientId = '9c05b721a93e422fa8e7fda9a1daeb54';
  private readonly responseType = 'token';
  private readonly redirectUri = 'http://localhost:8080';
  private readonly scopes = [
    'user-read-private',
    'user-read-email',
    'playlist-read-private',
    'playlist-modify-private',
    'playlist-modify-public',
    'playlist-read-collaborative',
  ];
  private authUrl = 'https://accounts.spotify.com/authorize'
  + `?client_id=${this.clientId}`
  + `&redirect_uri=${this.redirectUri}`
  + `&response_type=${this.responseType}`
  + `&scope=${this.getScopeUriString()}`
  + `&state=${'TODO'}`;


  static get styles() {
    return css``;
  }

  render() {
    return html`
      <button @click="${this.redirectToSpotifyAuth}">Login</button>
    `;
  }

  private redirectToSpotifyAuth() {
    window.location.href = this.authUrl;
  }

  private getScopeUriString() {
    return this.scopes.join(encodeURIComponent(' '));
  }
}