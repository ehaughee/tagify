import SpotifyWebApi from 'spotify-web-api-js';
import Cookies from 'js-cookie';
import { add } from 'date-fns';

type PlaylistListCache = SpotifyApi.PlaylistObjectSimplified[];
type PlaylistFullCache = { [key: string]: SpotifyApi.PlaylistObjectSimplified }

class Playlists {
  private readonly ACCESS_TOKEN_COOKIE_NAME = 'tagify_access_token';
  private readonly spotifyApi: SpotifyWebApi.SpotifyWebApiJs;

  private playlistsListCache: PlaylistListCache = [];
  private playlistCache: PlaylistFullCache = {};
 
  constructor() {
    // Make the API object an singleton and initialize it on parse
    this.spotifyApi = new SpotifyWebApi();
    this.spotifyApi.setAccessToken(this.getAccessToken());
  }

  async getPlaylists(): Promise<SpotifyApi.PlaylistObjectSimplified[]> {
    return new Promise((resolve, reject) => {
      if (this.playlistsListCache?.length > 0) {
        console.log('[Cache] HIT for Playlist List');
        resolve(this.playlistsListCache);
      }

      console.log('[Cache] MISS for Playlist List');
      
      this.spotifyApi.getUserPlaylists()
      .then((response) => {
        this.playlistsListCache = response.items;
        resolve(response.items);
      })
      .catch(e => reject(e));
    });
  }

  async getPlaylist(playlistId: string) {
    return new Promise((resolve, reject) => {
      if (this.playlistCache?.[playlistId]) {
        console.log(`[Cache] HIT for playlist '${playlistId}'`);
        
        resolve(this.playlistCache[playlistId]);
      }

      console.log(`[Cache] MISS for playlist '${playlistId}'`);

      this.spotifyApi.getPlaylist(playlistId)
      .then((response) => {
        this.playlistCache[playlistId] = response;
        resolve(response);
      })
      .catch(e => reject(e));
    });
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

export default new Playlists();