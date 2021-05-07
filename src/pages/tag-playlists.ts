import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import PlaylistsModel from '../models/playlists';

import '../components/tag-table';

@customElement('tag-playlists')
export class Playlists extends LitElement {
  @state() playlists: SpotifyApi.PlaylistObjectSimplified[] = [];

  static get styles() {
    return css``;
  }

  connectedCallback() {
    super.connectedCallback();
    return PlaylistsModel.getPlaylists()
    .then((playlists => {
      this.playlists = playlists;
    }));
  }

  render() {
    return html`
      <tag-table
        .headers="${['Name', 'Description']}"
        .items="${this.playlists.map(p => [p.name, p.description ?? ''])}"
      ></tag-table>
    `;
  }
}