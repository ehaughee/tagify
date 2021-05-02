import { LitElement, html, css } from 'lit';
import { property, state, customElement } from 'lit/decorators.js';
import Cookies from 'js-cookie';
import { add } from 'date-fns';
import SpotifyWebApi from 'spotify-web-api-js';

@customElement('app-root')
export class AppRoot extends LitElement {
  private readonly ACCESS_TOKEN_COOKIE_NAME = 'tagify_access_token';
  private spotifyApi: SpotifyWebApi.SpotifyWebApiJs;
  @state() playlists: SpotifyApi.PlaylistObjectSimplified[] = [];

  constructor() {
    super();
    this.spotifyApi = new SpotifyWebApi();
  }

  static get styles() {
    return css``;
  }

  connectedCallback() {
    super.connectedCallback();
    this.spotifyApi.setAccessToken(this.getAccessToken());
    this.getUserPlaylists();
  }

  render() {
    return html`
      <p>access_token: "${this.getAccessToken()}"</p>
      <a href="/login">Login</a>
      <a href="/playlists">Playlists</a>
      <ol>
        ${this.playlists.map((playlist) => 
          html`<li>${playlist.name}</li>`
        )}
      </ol>
    `;
  }

  private async getUserPlaylists() {
    const response = await this.spotifyApi.getUserPlaylists();
    this. playlists = response.items;
  }

  // TOOD: Move this to a mixin and use it EVERYWHERE
  private getAccessToken() {
    let accessToken = null;

    // Check cookie for access token
    const cookieAccessToken = this.getAccessTokenCookie();
    if (cookieAccessToken) {
      accessToken = cookieAccessToken;
    }

    // Check url for access token
    const urlAccesstoken = this.getHashValueByKey('access_token');
    if (urlAccesstoken) {
      accessToken = urlAccesstoken;
      const urlExpiresIn = this.getHashValueByKey('expires_in');
      const expiresIn = Number(urlExpiresIn);

      // Got access token from URL, save in cookie
      this.setAccessTokenCookie(urlAccesstoken, expiresIn)
    }

    return accessToken;
  }
  
  private getHashValueByKey(key: string) {
    const parsedHash = new URLSearchParams(
      window.location.hash.substr(1) // skip the first char (#)
    );
    return parsedHash.get(key);
  }

  private getAccessTokenCookie() {
    return Cookies.get(this.ACCESS_TOKEN_COOKIE_NAME);
  }
  
  private setAccessTokenCookie(accessToken: string, expiresInSeconds: number) {
    // Default to 1 hour if expiresInSeconds is invalid
    let expiry = add(new Date().getTime(), { hours: 1 });

    if (!isNaN(expiresInSeconds)) {
      expiry = add(new Date().getTime(), { seconds: expiresInSeconds });
    }

    Cookies.set(this.ACCESS_TOKEN_COOKIE_NAME, accessToken, { expires: expiry });
  }
}
