import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import PlaylistsModel from '../models/playlists';

import '../components/tag-table';
import type { TableColumn } from '../components/tag-table';

@customElement('tag-playlists')
export class Playlists extends LitElement {
  @state() playlists: SpotifyApi.PlaylistObjectSimplified[] = [];

  static get styles() {
    return css``;
  }

  get columns(): TableColumn[] {
    return [
      {
        id: 'name',
        header: 'Name',
        render: (data) => html`
          <a href="/playlists/${data.id}">
            ${data.name}
          </a>
        `,
      },
      {
        id: 'description',
        header: 'Description',
        render: (data) => html`${data.description || ''}`,
      }
    ]
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
        .data=${this.playlists}
        .columns=${this.columns}
      ></tag-table>
    `;
  }
}