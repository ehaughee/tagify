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
        @prevClick=${this.onClickPrev}
        @nextClick=${this.onClickNext}
      ></tag-table>
    `;
  }

  private get columns(): TableColumn<SpotifyApi.PlaylistObjectSimplified>[] {
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

  private onClickNext() {
    console.log('Got click next event');
  }

  private onClickPrev() {
    console.log('Got click prev event');
  }
}