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
    // @ts-ignore, no generic supprt in html template literals
    return html`
      <tag-table
        .data=${this.tracks}
        .columns=${this.columns}
        .onClickPrev=${this.onTablePaginateHandler}
        .onClickNext=${this.onTablePaginateHandler}
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
  
  private onTablePaginateHandler = async (paginationState: TablePaginationState) => {
    const offset = paginationState.curPage * paginationState.pageSize;
    const limit = paginationState.pageSize;
    const playlistTrackObjects = await PlaylistsModel.getPlaylistTracks(this.playlist?.id, offset, limit);
    return playlistTrackObjects.map(obj => obj.track);
  }

  private formatArtistList(artists: SpotifyApi.ArtistObjectSimplified[]) {
    return html`
      ${artists.map(a => a.name).join(', ')}
    `;
  }
}