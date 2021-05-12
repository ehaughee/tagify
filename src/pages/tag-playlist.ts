import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { router } from '../index';
import PlaylistsModel from '../models/playlists';

@customElement('tag-playlist')
export class Playlist extends LitElement {
  @property({type: Object}) location = router.location;
  @state() playlist: SpotifyApi.PlaylistObjectFull | undefined;

  static get styles() {
    return css``;
  }

  connectedCallback() {
    super.connectedCallback();
    const playlistId: string = this.location.params.id as string;
    return PlaylistsModel.getPlaylist(playlistId)
    .then((playlist => {
      this.playlist = playlist;
    }));
  }

  render() {
    return html`
      <h1>${this.playlist?.name || ''}</h1>
      <ol>
        ${this.playlist?.tracks.items.map(item => {
          return html`
            <li>
              ${item.track.name}
            </li>
          `;
        })}
      </ol>
    `;
  }
}