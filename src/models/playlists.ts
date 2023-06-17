import SpotifyWebApi from "spotify-web-api-js";
import Cookies from "js-cookie";
import { add } from "date-fns";
import { Cache, CacheClass } from "memory-cache";

const PLAYLISTS_CACHE_KEY = "user_playlists"
const PLAYLISTS_CACHE_TTL_MS = 1000 * 60; // 1 minute

export interface TagifyPlaylistSimplified extends SpotifyApi.PlaylistObjectSimplified {
  key: string;
}

export interface TagifyPlaylist {
  playlist: SpotifyApi.PlaylistObjectFull;
  tracks: SpotifyApi.PagingObject<SpotifyApi.PlaylistTrackObject>;
}

class PlaylistsModel {
  private readonly ACCESS_TOKEN_COOKIE_NAME = "tagify_access_token";
  private readonly spotifyApi: SpotifyWebApi.SpotifyWebApiJs;
  private playlistsSimplifiedCache: CacheClass<string, TagifyPlaylistSimplified[]>;
  private playlistsCache: CacheClass<string, TagifyPlaylist>
  private playlistTracksCache: CacheClass<string, SpotifyApi.PlaylistTrackObject[]>;

  constructor() {
    // Make the API object an singleton and initialize it on parse
    this.spotifyApi = new SpotifyWebApi();
    this.spotifyApi.setAccessToken(this.getAccessToken());
    this.playlistsSimplifiedCache = new Cache();
    this.playlistsCache = new Cache();
    this.playlistTracksCache = new Cache();
  }

  /**
   * Get the current users playlists
   * @param cache Whether to look in the cache or not.  Default: true
   * @returns The current users playlists, paginated
   */
  async getPlaylists(cache = true): Promise<TagifyPlaylistSimplified[]> {
    return new Promise((resolve, reject) => {
      if (cache) {
        const playlists = this.playlistsSimplifiedCache.get(PLAYLISTS_CACHE_KEY);
        if (playlists != null) {
          console.log("[Cache] HIT for Playlist List");
          return playlists;
        }
      }

      console.log(`[Cache] ${cache ? "MISS" : "SKIP"} for Playlist List`);

      this.spotifyApi
        .getUserPlaylists()
        .then((response) => {
          const tagifyPlaylists = response.items.map((playlist) => {
            // Set key property for React
            const tagifyPlaylist: TagifyPlaylistSimplified = {
              key: playlist.id,
              ...playlist,
            };
            return tagifyPlaylist;
          });
          this.playlistsSimplifiedCache.put(PLAYLISTS_CACHE_KEY, tagifyPlaylists, PLAYLISTS_CACHE_TTL_MS);
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
  ): Promise<TagifyPlaylist> {
    return new Promise((resolve, reject) => {
      if (cache) {
        const playlist = this.playlistsCache.get(playlistId)
        if (playlist != null) {
          console.log(`[Cache] HIT for playlist '${playlistId}'`);
  
          resolve(playlist);
          return;
        }
      }

      console.log(
        `[Cache] ${cache ? "MISS" : "SKIP"} for playlist '${playlistId}'`
      );

      this.spotifyApi
        .getPlaylist(playlistId)
        .then((getPlaylistResponse) => {
          
          // Get first page of playlist tracks
          //  TODO: Paginate
          this.spotifyApi
          .getPlaylistTracks(playlistId, { limit: 50 })
          .then((getPlaylistTracksResponse) => {
            const playlist: TagifyPlaylist = {
              playlist: getPlaylistResponse,
              tracks: getPlaylistTracksResponse,
            };
            this.playlistsCache.put(playlistId, playlist, PLAYLISTS_CACHE_TTL_MS);
            resolve(playlist)
          })
          .catch((e) => reject(e));
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
    limit = 50, // Maximum API allows
    cache = true
  ): Promise<SpotifyApi.PlaylistTrackObject[]> {
    return new Promise((resolve, reject) => {
      const cacheKey = this.buildPlaylistTracksCacheKey(playlistId, offset, limit);
      if (cache) {
        const playlistSpan = this.playlistTracksCache.get(cacheKey)
        if (playlistSpan != null) {
          console.log(
            `[Cache] HIT for playlist '${playlistId}[${offset}, ${
              offset + limit
            }]'`
          );
  
          resolve(playlistSpan);
          return;
        }
      }

      console.log(
        `[Cache] ${
          cache ? "MISS" : "SKIP"
        } for playlist '${playlistId}[${offset}, ${offset + limit}]'`
      );

      this.spotifyApi
        .getPlaylistTracks(playlistId, { offset: offset, limit: limit })
        .then((response) => {
          this.playlistTracksCache.put(cacheKey, response.items, PLAYLISTS_CACHE_TTL_MS);
          resolve(response.items);
        })
        .catch((e) => reject(e));
    });
  }

  private buildPlaylistTracksCacheKey(playlistId: string, offset: number, limit: number): string {
    return `${playlistId}_${offset}_${limit}`;
  }

  // private cacheSpanInitialized(cache: any[], start: number, count: number) {
  //   if (count < 1) throw new Error("'count' must be greater than 0");
  //   if (start < 0) throw new Error("'start' must be greater than 0");

  //   if (start > cache.length) return false;
  //   if (cache.length < 1) return false;
  //   const cacheSpan = cache.slice(start, start + count);
  //   return cacheSpan.length > 0 && cacheSpan.every((e) => e != null);
  // }

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

const singletonPlaylistModel = Object.freeze(new PlaylistsModel());

export default singletonPlaylistModel
