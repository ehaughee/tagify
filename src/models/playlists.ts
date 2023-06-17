import SpotifyWebApi from "spotify-web-api-js";
import Cookies from "js-cookie";
import { add } from "date-fns";
import { Cache, CacheClass } from "memory-cache";
import { Tag } from "../pages/components/tagSelect";

const PLAYLISTS_CACHE_KEY = "user_playlists"
const PLAYLISTS_CACHE_TTL_MS = 1000 * 60; // 1 minute

export interface TagifyPlaylistSimplified extends SpotifyApi.PlaylistObjectSimplified {
  key: string;
}

export interface TagifyPlaylist {
  playlist: SpotifyApi.PlaylistObjectFull;
  tracks: Set<TagifyPlaylistTrack>;
}

export interface TagifyPlaylistTrack extends SpotifyApi.PlaylistTrackObject {
  key: string;
  tags: Tag[];
}

class PlaylistsModel {
  private readonly ACCESS_TOKEN_COOKIE_NAME = "tagify_access_token";
  private readonly spotifyApi: SpotifyWebApi.SpotifyWebApiJs;
  private playlistsSimplifiedCache: CacheClass<string, TagifyPlaylistSimplified[]>;
  private playlistsCache: CacheClass<string, TagifyPlaylist>
  private playlistTracksCache: CacheClass<string, TagifyPlaylistTrack[]>;
  private tracksCache: CacheClass<string, TagifyPlaylistTrack>;

  constructor() {
    console.log("Creating PlaylistsModel instance...");

    // Spotify API client
    this.spotifyApi = new SpotifyWebApi();
    this.spotifyApi.setAccessToken(this.getAccessToken());

    // Caches
    this.playlistsSimplifiedCache = new Cache();
    this.playlistsCache = new Cache();
    this.playlistTracksCache = new Cache();
    this.tracksCache = new Cache();
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
            // Set key property for React lists
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
          this.spotifyApi
            .getPlaylistTracks(playlistId, { limit: 50 })
            .then((getPlaylistTracksResponse) => {
              const playlist: TagifyPlaylist = {
                playlist: getPlaylistResponse,
                tracks: new Set(this.makeTagifyTracks(getPlaylistTracksResponse.items)),
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
   * Get tracks from a playlist by offset and limit
   * @param playlistId The ID of the playlist to retrieve tracks from
   * @param offset How many tracks into the playlist the response should start at
   * @param limit The number of tracks the response should contain, max 50
   * @param cache Whether to look in the cache or not.  Default: true
   * @returns Tracks from the specified playlist
   * @todo Return the pagination object
   */
  async getPlaylistTracks(
    playlistId: string,
    offset = 0,
    limit = 50, // Maximum API allows
    cache = true
  ): Promise<TagifyPlaylistTrack[]> {
    return new Promise((resolve, reject) => {
      const cacheKey = this.buildPlaylistTracksCacheKey(playlistId, offset, limit);
      if (cache) {
        const playlistSpan = this.playlistTracksCache.get(cacheKey)
        if (playlistSpan != null) {
          console.log(
            `[Cache] HIT for playlist span "${cacheKey}"`
          );
  
          resolve(playlistSpan);
          return;
        }
      }

      console.log(
        `[Cache] ${cache ? "MISS" : "SKIP"} for playlist span "${cacheKey}"`
      );

      this.spotifyApi
        .getPlaylistTracks(playlistId, { offset: offset, limit: limit })
        .then((response) => {
          const tracks = this.makeTagifyTracks(response.items)

          this.playlistTracksCache.put(cacheKey, tracks, PLAYLISTS_CACHE_TTL_MS);

          this.mergeTrackCache(playlistId, tracks)

          resolve(tracks);
        })
        .catch((e) => reject(e));
    });
  }

  private makeTagifyTracks(spotifyTracks: SpotifyApi.PlaylistTrackObject[]): TagifyPlaylistTrack[] {
    return spotifyTracks.map(spotifyTrack => ({
      key: spotifyTrack.track.id,
      tags: this.getTrackTags(spotifyTrack),
      ...spotifyTrack
    }))
  }

  private getTrackTags(track: SpotifyApi.PlaylistTrackObject): Tag[] {
    // Loop through all playlists in cache
    // Look for presence in playlist
    return [];
  }

  private buildPlaylistTracksCacheKey(playlistId: string, offset: number, limit: number): string {
    return `${playlistId}_${offset}_${limit}`;
  }

  private async mergeTrackCache(playlistId: string, tracks: TagifyPlaylistTrack[]) {
    const playlist = this.playlistsCache.get(playlistId)
    if (playlist == null) {
      console.warn(`Attempted to merge tracks into null playlist "${playlistId}"`);
      return;
    }

    const trackSet = new Set(playlist.tracks)
    tracks.forEach(track => trackSet.add(track))
    playlist.tracks = trackSet;
  }

  // TOOD: Move these to a common location instead of duplicated between home.tsx and here
  private getAccessToken(): string | null {
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

  private getHashValueByKey(key: string): string | null {
    const parsedHash = new URLSearchParams(
      window.location.hash.substr(1) // skip the first char (#)
    );
    return parsedHash.get(key);
  }

  private getAccessTokenCookie(): string | undefined {
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
