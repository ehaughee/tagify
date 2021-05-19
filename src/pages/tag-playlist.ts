import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { TableColumn, TablePaginationState } from 'src/components/tag-table';
import { router } from '../index';
import PlaylistsModel from '../models/playlists';

@customElement('tag-playlist')
export class Playlist extends LitElement {
  @property({type: Object}) location = router.location;
  @state() playlist!: SpotifyApi.PlaylistObjectFull;
  @state() tracks: SpotifyApi.TrackObjectFull[] = [];

  static get styles() {
    return css``;
  }

  connectedCallback() {
    super.connectedCallback();
    const playlistId: string = this.location.params.id as string;
    return PlaylistsModel.getPlaylist(playlistId)
    .then((playlist => {
      this.playlist = playlist;
      // TODO: See if there is a better hint for TS than unhooking the type checking with `unknown`
      this.tracks = this.playlist?.tracks?.items?.map(i => i.track) as unknown as SpotifyApi.TrackObjectFull[];
    }));
  }

  render() {
    // return html`
    //   <h1>${this.playlist?.name || ''}</h1>
    //   <ol>
    //     ${this.playlist?.tracks.items.map(item => {
    //       return html`
    //         <li>
    //           ${item.track.name}
    //         </li>
    //       `;
    //     })}
    //   </ol>
    // `;

    return html`
      <tag-table
        .data=${this.tracks}
        .columns=${this.columns}
        @prevClick=${this.onClickPrev}
        @nextClick=${this.onClickNext}
      ></tag-table>
    `;
  }

  private get columns(): TableColumn<SpotifyApi.TrackObjectFull>[] {
    return [
      {
        id: 'title',
        header: 'Title',
        render: (data) => html`
          ${data.name}
        `,
      },
      {
        id: 'artists',
        header: 'Artists',
        render: (data) => html`${this.formatArtistList(data.artists)}`,
      }
    ]
  }

  private onClickPrev(_e: CustomEvent<TablePaginationState>) {
    // TODO: For the simple case, nothing needs to be done here.
    //       Refreshing the table at any page > 1 will require
    //       an API call on previous.
  }
  
  private onClickNext(e: CustomEvent<TablePaginationState>) {
    const offset = e.detail.curPage * e.detail.pageSize;
    const limit = e.detail.pageSize;
    console.log(`Offset: ${offset}, Limit: ${limit}`);
    PlaylistsModel.getPlaylistTracks(this.playlist?.id, offset, limit)
    .then(tracks => {
      console.log(tracks);
    })
  }

  private formatArtistList(artists: SpotifyApi.ArtistObjectSimplified[]) {
    return html`
      ${artists.map(a => a.name).join(', ')}
    `;
  }
}