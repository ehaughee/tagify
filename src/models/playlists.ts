import SpotifyWebApi from "spotify-web-api-js";
import Cookies from "js-cookie";
import { add } from "date-fns";

type PlaylistListCache = TagifyPlaylistSimplified[];
type PlaylistFullCache = { [key: string]: SpotifyApi.PlaylistObjectFull };
interface TagifyPlaylistSimplified extends SpotifyApi.PlaylistObjectSimplified {
  key: string;
}

class Playlists {
  private readonly ACCESS_TOKEN_COOKIE_NAME = "tagify_access_token";
  private readonly spotifyApi: SpotifyWebApi.SpotifyWebApiJs;

  private playlistsListCache: PlaylistListCache = [];
  private playlistCache: PlaylistFullCache = {};

  constructor() {
    // Make the API object an singleton and initialize it on parse
    this.spotifyApi = new SpotifyWebApi();
    this.spotifyApi.setAccessToken(this.getAccessToken());
  }

  /**
   * Get the current users playlists
   * @param cache Whether to look in the cache or not.  Default: true
   * @returns The current users playlists, paginated
   */
  async getPlaylists(cache = true): Promise<TagifyPlaylistSimplified[]> {
    return new Promise((resolve, reject) => {
      if (cache && this.playlistsListCache.length > 0) {
        console.log("[Cache] HIT for Playlist List");
        return this.playlistsListCache;
        return;
      }

      console.log(`[Cache] ${cache ? "MISS" : "SKIP"} for Playlist List`);

      this.spotifyApi
        .getUserPlaylists()
        .then((response) => {
          const tagifyPlaylists = response.items.map((playlist) => {
            // Set key property for React
            const tagifyPlaylist = {
              key: playlist.id,
              ...playlist,
            };
            return tagifyPlaylist;
          });
          this.playlistsListCache = tagifyPlaylists;
          resolve(tagifyPlaylists);
        })
        .catch((e) => reject(e));
    });
  }

  /**
   * Get a playlist by ID
   * @param playlistId The ID of the playlist to retrieve
   * @param cache Whether to look in the cache or not.  Default: true
   * @returns Playlist object
   */
  async getPlaylist(
    playlistId: string,
    cache = true
  ): Promise<SpotifyApi.PlaylistObjectFull> {
    return new Promise((resolve, reject) => {
      if (cache && this.playlistCache?.[playlistId]) {
        console.log(`[Cache] HIT for playlist '${playlistId}'`);

        resolve(this.playlistCache[playlistId]);
        return;
      }

      console.log(
        `[Cache] ${cache ? "MISS" : "SKIP"} for playlist '${playlistId}'`
      );

      this.spotifyApi
        .getPlaylist(playlistId)
        .then((response) => {
          this.playlistCache[playlistId] = response;
          resolve(response);
        })
        .catch((e) => reject(e));
    });
  }

  /**
   * Get tracks from a playlist
   * @param playlistId The ID of the playlist to retrieve tracks from
   * @param offset How many tracks into the playlist the response should start at
   * @param limit The number of tracks the response should contain
   * @param cache Whether to look in the cache or not.  Default: true
   * @returns Tracks from the specified playlist
   */
  async getPlaylistTracks(
    playlistId: string,
    offset = 0,
    limit = 100,
    cache = true
  ): Promise<SpotifyApi.PlaylistTrackObject[]> {
    return new Promise((resolve, reject) => {
      if (
        cache &&
        this.cacheSpanInitialized(
          this.playlistCache?.[playlistId]?.tracks.items,
          offset,
          limit
        )
      ) {
        console.log(
          `[Cache] HIT for playlist '${playlistId}[${offset}, ${
            offset + limit
          }]'`
        );

        resolve(
          this.playlistCache[playlistId]?.tracks.items.slice(
            offset,
            offset + limit
          )
        );
        return;
      }

      console.log(
        `[Cache] ${
          cache ? "MISS" : "SKIP"
        } for playlist '${playlistId}[${offset}, ${offset + limit}]'`
      );

      this.spotifyApi
        .getPlaylistTracks(playlistId, { offset: offset, limit: limit })
        .then((response) => {
          this.playlistCache[playlistId]?.tracks.items.splice(
            offset,
            limit,
            ...response.items
          );
          resolve(response.items);
        })
        .catch((e) => reject(e));
    });
  }

  private cacheSpanInitialized(cache: any[], start: number, count: number) {
    if (count < 1) throw new Error("'count' must be greater than 0");
    if (start < 0) throw new Error("'start' must be greater than 0");

    if (start > cache.length) return false;
    if (cache.length < 1) return false;
    const cacheSpan = cache.slice(start, start + count);
    return cacheSpan.length > 0 && cacheSpan.every((e) => e != null);
  }

  // TOOD: Move this following functions to a mixin/helper
  private getAccessToken() {
    let accessToken = null;

    // Check cookie for access token
    const cookieAccessToken = this.getAccessTokenCookie();
    if (cookieAccessToken) {
      accessToken = cookieAccessToken;
    }

    // Check url for access token
    const urlAccesstoken = this.getHashValueByKey("access_token");
    if (urlAccesstoken) {
      accessToken = urlAccesstoken;
      const urlExpiresIn = this.getHashValueByKey("expires_in");
      const expiresIn = Number(urlExpiresIn);

      // Got access token from URL, save in cookie
      this.setAccessTokenCookie(urlAccesstoken, expiresIn);
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

    Cookies.set(this.ACCESS_TOKEN_COOKIE_NAME, accessToken, {
      expires: expiry,
    });
  }
}

export default new Playlists();
