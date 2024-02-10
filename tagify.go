package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"tagify/middleware"
	"time"

	"github.com/gin-contrib/cache"
	"github.com/gin-contrib/cache/persistence"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/zmb3/spotify/v2"
	spotifyauth "github.com/zmb3/spotify/v2/auth"
	"golang.org/x/oauth2"
)

const (
	// TODO: Parameterize this
	authRedirectURL = "http://localhost:8080/auth_redir"

	SPOTIFY_ID_ENV     = "SPOTIFY_ID"
	SPOTIFY_SECRET_ENV = "SPOTIFY_SECRET"

	COOKIE_AUTH_KEY = "COOKIE_AUTH_KEY"

	spotifyTokenSessionKey        = "spotify-token"
	spotifyAccessTokenSessionKey  = "spotify-access-token"
	spotifyRefreshTokenSessionKey = "spotify-refresh-token"
)

var (
	auth *spotifyauth.Authenticator
)

func main() {
	// Load dev environment variables
	// TODO: Conditionally do this depending on the Gin mode (dev vs release)
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Failed to load .env file with error: %v", err)
	}

	// Create new Spotify Authenticator.  This must be done after we've loaded the environment variables.
	auth = spotifyauth.New(
		spotifyauth.WithRedirectURL(authRedirectURL),
		spotifyauth.WithScopes(spotifyauth.ScopeUserReadPrivate),
	)

	r := gin.Default()

	// Load templates
	r.LoadHTMLGlob("templates/*")

	// Initialize cache
	cache_store := persistence.NewInMemoryStore(time.Minute * 5)

	// Setup session management
	// TODO: Use a backend store such that the Spotify tokens are not in the cookie
	cookieAuthKey := os.Getenv(COOKIE_AUTH_KEY)
	if cookieAuthKey == "" {
		log.Fatalf("Required environment variable %q was empty", COOKIE_AUTH_KEY)
	}
	session_store := cookie.NewStore([]byte(cookieAuthKey))
	// TODO: Figure out why these options seem to have no effect on the cookies actually written
	session_store.Options(sessions.Options{
		// Set max session duration to 61 minutes as the Spotify tokens last 60 minutes
		MaxAge:   int(time.Minute * 61),
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})
	r.Use(sessions.Sessions("tagify_user_session", session_store))

	// Setup error handling
	r.Use(middleware.ErrorHandler)

	setupRoutes(r, cache_store)

	r.Run()
}

func setupRoutes(r *gin.Engine, cache_store persistence.CacheStore) {
	r.GET("/", rootHandler(cache_store))
	r.GET("/home:format", homeHandler(cache_store))
	r.GET("/home", homeHandler(cache_store))
	r.GET("/playlists", playlistsHandler(cache_store))
	r.GET("/playlists:format", playlistsHandler(cache_store))
	// TODO: Figure out a better way to do .json because :id:format doesn't work
	r.GET("/playlists/:id", playlistHandler(cache_store))
	r.GET("/auth_redir", authRedirectHandler(cache_store))
	r.GET("/login", loginHandler(cache_store))
	r.GET("/logout", logoutHandler(cache_store))
}

func rootHandler(cache_store persistence.CacheStore) func(c *gin.Context) {
	return func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.tmpl", gin.H{
			"message": "👋🏻",
		})
	}
}

func homeHandler(cache_store persistence.CacheStore) func(c *gin.Context) {
	return cache.CachePage(cache_store, time.Minute*5, func(c *gin.Context) {
		if !loggedIn(c) {
			c.Redirect(http.StatusPermanentRedirect, "/login")
		}

		client, err := getClient(c)
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
			return
		}

		currentUser, err := client.CurrentUser(c.Request.Context())
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
			return
		}

		if strings.ToLower(c.Param("format")) == ".json" {
			c.JSON(http.StatusOK, gin.H{
				"currentUser": currentUser,
			})
			return
		}

		c.HTML(http.StatusOK, "home.tmpl", gin.H{
			"name": currentUser.DisplayName,
			"url":  currentUser.ExternalURLs["spotify"],
		})
	})
}

func playlistsHandler(cache_store persistence.CacheStore) func(c *gin.Context) {
	return cache.CachePage(cache_store, time.Minute*5, func(c *gin.Context) {
		// TODO: Add loggedIn? middleware
		// TODO: Implement redirection back to original page if redirected to /login
		if !loggedIn(c) {
			c.Redirect(http.StatusPermanentRedirect, "/login")
		}

		token, err := getSpotifyToken(c)
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
			return
		}

		httpClient := auth.Client(c, token)
		client := spotify.New(httpClient)

		playlistsPage, err := client.CurrentUsersPlaylists(c.Request.Context())
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
			return
		}

		var playlists []spotify.SimplePlaylist
		for {
			playlists = append(playlists, playlistsPage.Playlists...)
			if err := client.NextPage(c.Request.Context(), playlistsPage); err == spotify.ErrNoMorePages {
				break
			} else if err != nil {
				c.AbortWithError(http.StatusInternalServerError, err)
			}
		}

		if strings.ToLower(c.Param("format")) == ".json" {
			c.JSON(http.StatusOK, gin.H{
				"playlists": playlists,
			})
			return
		}

		c.HTML(http.StatusOK, "playlists.tmpl", gin.H{
			"playlists": playlists,
		})
	})
}

func playlistHandler(cache_store persistence.CacheStore) func(c *gin.Context) {
	return cache.CachePage(cache_store, time.Minute*5, func(c *gin.Context) {
		playlistID := c.Param("id")

		client, err := getClient(c)
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
		}

		tracksPage, err := client.GetPlaylistItems(c.Request.Context(), spotify.ID(playlistID))
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
			return
		}

		var tracks []spotify.PlaylistItem
		for {
			tracks = append(tracks, tracksPage.Items...)
			if err := client.NextPage(c.Request.Context(), tracksPage); err == spotify.ErrNoMorePages {
				break
			} else if err != nil {
				c.AbortWithError(http.StatusInternalServerError, err)
			}
		}

		if strings.ToLower(c.Param("format")) == ".json" {
			c.JSON(http.StatusOK, gin.H{
				"tracks": tracks,
			})
			return
		}

		c.HTML(http.StatusOK, "playlist.tmpl", gin.H{
			"tracks": tracks,
		})
	})
}

func loginHandler(cache_store persistence.CacheStore) func(c *gin.Context) {
	return func(c *gin.Context) {
		// Check if we already have a token, meaning we're already logged in
		// TODO: Handle token expiry as well as near-expiry
		if !loggedIn(c) {
			// TODO: Use a GUID, stored in the session, for state ("test") here
			c.Redirect(http.StatusMovedPermanently, auth.AuthURL("test"))
		}

		c.Redirect(http.StatusMovedPermanently, "/home")
	}
}

func logoutHandler(cache_store persistence.CacheStore) func(c *gin.Context) {
	return func(c *gin.Context) {
		if loggedIn(c) {
			logOut(c)
		}

		c.Redirect(http.StatusTemporaryRedirect, "/")
	}
}

func authRedirectHandler(cache_store persistence.CacheStore) func(c *gin.Context) {
	return func(c *gin.Context) {
		// TODO: Generate a GUID here and use it for state ("test"), then store it in the session
		token, err := auth.Token(c.Request.Context(), "test", c.Request)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": err,
			})
			return
		}

		storeSpotifyToken(token, c)
		c.Redirect(http.StatusTemporaryRedirect, "/home")
	}
}

func loggedIn(c *gin.Context) bool {
	token, err := getSpotifyToken(c)
	return err == nil && token != nil
}

func getSpotifyToken(c *gin.Context) (*oauth2.Token, error) {
	sessionVal := sessions.Default(c).Get(spotifyTokenSessionKey)
	if sessionVal == nil {
		return nil, fmt.Errorf("failed to find Spotify token under session key %q", spotifyTokenSessionKey)
	}

	if serializedToken, ok := sessionVal.(string); !ok {
		return nil, fmt.Errorf("failed to find Spotify token with type %T, found %T", "", sessionVal)
	} else if token, err := deserializeToken([]byte(serializedToken)); err != nil {
		return nil, fmt.Errorf("failed to deserialize Spotify token with error: %w", err)
	} else {
		return token, nil
	}

}

func storeSpotifyToken(token *oauth2.Token, c *gin.Context) error {
	session := sessions.Default(c)
	if tokenBytes, err := serializeToken(token); err != nil {
		return fmt.Errorf("failed to serialize Spotify token with error: %w", err)
	} else {
		session.Set(spotifyTokenSessionKey, string(tokenBytes))
	}

	session.Options(sessions.Options{
		// Invalidate session at token expiry time
		// TODO: Figure out why this is very wrong
		MaxAge: int(time.Until(token.Expiry)),
	})
	session.Save()
	return nil
}

func serializeToken(token *oauth2.Token) ([]byte, error) {
	return json.Marshal(token)
}

func deserializeToken(tokenBytes []byte) (*oauth2.Token, error) {
	token := &oauth2.Token{}
	if err := json.Unmarshal(tokenBytes, token); err != nil {
		return nil, err
	}
	return token, nil
}

func logOut(c *gin.Context) {
	session := sessions.Default(c)
	session.Delete(spotifyAccessTokenSessionKey)

	// Invalidate the session
	session.Options(sessions.Options{
		MaxAge: -1,
	})

	session.Save()
}

func getClient(c *gin.Context) (*spotify.Client, error) {
	token, err := getSpotifyToken(c)
	if err != nil {
		return nil, err
	}

	httpClient := auth.Client(c, token)
	return spotify.New(httpClient), nil
}
