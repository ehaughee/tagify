package main

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"tagify/auth"
	"tagify/middleware"
	"time"

	"github.com/gin-contrib/cache"
	"github.com/gin-contrib/cache/persistence"
	"github.com/gin-contrib/multitemplate"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/zmb3/spotify/v2"
	sauth "github.com/zmb3/spotify/v2/auth"
)

const (
	CookieAuthKey = "COOKIE_AUTH_KEY"
)

var (
	spotifyAuthenticator *sauth.Authenticator
)

func main() {
	// Load dev environment variables
	if gin.Mode() == gin.DebugMode {
		err := godotenv.Load()
		if err != nil {
			log.Fatalf("Failed to load .env file with error: %v", err)
		}
	}

	// Create new Spotify Authenticator.  This must be done after we've loaded the environment variables.
	spotifyAuthenticator = sauth.New(
		sauth.WithRedirectURL(auth.GetAuthRedirectURL()),
		sauth.WithScopes(
			sauth.ScopeUserReadPrivate,
			sauth.ScopePlaylistReadCollaborative,
			sauth.ScopeUserLibraryRead,
		),
	)

	// Default With the Logger and Recovery middleware already attached
	r := gin.Default()

	// Static files
	r.StaticFile("/favicon.ico", "./static/favicon.ico")
	r.Static("/css", "./static/css")

	// Load templates
	r.HTMLRender = loadTemplates("./templates")

	// Initialize cache
	cacheStore := persistence.NewInMemoryStore(time.Minute * 5)

	// Setup session management
	// TODO: Use a backend store such that the Spotify tokens are not in the cookie
	cookieAuthKey := os.Getenv(CookieAuthKey)
	if cookieAuthKey == "" {
		log.Fatalf("Required environment variable %q was empty", CookieAuthKey)
	}
	sessionStore := cookie.NewStore([]byte(cookieAuthKey))
	// TODO: Figure out why these options seem to have no effect on the cookies actually written
	sessionStore.Options(sessions.Options{
		// Set max session duration to 59 minutes as the Spotify tokens last 60 minutes
		MaxAge:   int(time.Minute * 59),
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})
	r.Use(sessions.Sessions("tagify_user_session", sessionStore))

	// Setup error handling
	r.Use(middleware.ErrorHandler)

	setupRoutes(r, cacheStore)

	err := r.Run()
	if err != nil {
		log.Fatalf(fmt.Sprintf("failed to start Tagify with error: %v", err))
	}
}

func loadTemplates(templatesDir string) multitemplate.Renderer {
	r := multitemplate.NewRenderer()

	layouts, err := filepath.Glob(templatesDir + "/layouts/*.tmpl")
	if err != nil {
		panic(err.Error())
	}

	includes, err := filepath.Glob(templatesDir + "/includes/*.tmpl")
	if err != nil {
		panic(err.Error())
	}

	// Generate our templates map from our layouts/ and includes/ directories
	for _, include := range includes {
		layoutCopy := make([]string, len(layouts))
		copy(layoutCopy, layouts)
		files := append(layoutCopy, include)
		r.AddFromFiles(filepath.Base(include), files...)
	}
	return r
}

func setupRoutes(r *gin.Engine, cacheStore persistence.CacheStore) {
	// Root
	r.GET("/", rootHandler(cacheStore))

	// Home
	r.GET("/home", homeHandler(cacheStore, false))
	r.GET("/api/home", homeHandler(cacheStore, true))

	// Playlists
	r.GET("/playlists", playlistsHandler(cacheStore, false))
	r.GET("/api/playlists", playlistsHandler(cacheStore, true))

	// Playlist
	r.GET("/playlists/:id", playlistHandler(cacheStore))
	r.GET("/api/playlists/:id", playlistHandler(cacheStore))

	// Authentication
	r.GET("/auth_redir", authRedirectHandler(cacheStore))
	r.GET("/login", loginHandler(cacheStore))
	r.GET("/logout", logoutHandler(cacheStore))
}

func rootHandler(_ persistence.CacheStore) func(c *gin.Context) {
	return func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.tmpl", gin.H{
			"message": "👋🏻",
		})
	}
}

func homeHandler(cacheStore persistence.CacheStore, json bool) func(c *gin.Context) {
	return cache.CachePage(cacheStore, time.Minute*5, func(c *gin.Context) {
		if !auth.NeedsAuth(c) {
			c.Redirect(http.StatusTemporaryRedirect, "/login")
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

		if json {
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

func playlistsHandler(cacheStore persistence.CacheStore, json bool) func(c *gin.Context) {
	return cache.CachePage(cacheStore, time.Minute*5, func(c *gin.Context) {
		// TODO: Add loggedIn? middleware
		// TODO: Implement redirection back to original page if redirected to /login
		if !auth.NeedsAuth(c) {
			c.Redirect(http.StatusTemporaryRedirect, "/login")
		}

		token, err := auth.GetSpotifyToken(c)
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
			return
		}

		httpClient := spotifyAuthenticator.Client(c, token)
		client := spotify.New(httpClient)

		playlistsPage, err := client.CurrentUsersPlaylists(c.Request.Context(), spotify.Limit(50))
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
			return
		}

		var playlists []spotify.SimplePlaylist
		for {
			playlists = append(playlists, playlistsPage.Playlists...)
			if err := client.NextPage(c.Request.Context(), playlistsPage); errors.Is(err, spotify.ErrNoMorePages) {
				break
			} else if err != nil {
				c.AbortWithError(http.StatusInternalServerError, err)
			}
		}

		if json {
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

func playlistHandler(cacheStore persistence.CacheStore) func(c *gin.Context) {
	return cache.CachePage(cacheStore, time.Minute*5, func(c *gin.Context) {
		// TODO: Add loggedIn? middleware
		// TODO: Implement redirection back to original page if redirected to /login
		if !auth.NeedsAuth(c) {
			c.Redirect(http.StatusTemporaryRedirect, "/login")
		}

		playlistID := c.Param("id")

		client, err := getClient(c)
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
		}

		// Get playlist
		playlist, err := client.GetPlaylist(
			c.Request.Context(),
			spotify.ID(playlistID),
			spotify.Limit(50),
		)
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
			return
		}

		// Get playlist tracks
		tracksPage, err := client.GetPlaylistItems(
			c.Request.Context(),
			spotify.ID(playlistID),
			spotify.Limit(50),
		)
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
			return
		}

		var tracks []spotify.PlaylistItem
		for {
			tracks = append(tracks, tracksPage.Items...)
			if err := client.NextPage(c.Request.Context(), tracksPage); errors.Is(err, spotify.ErrNoMorePages) {
				break
			} else if err != nil {
				c.AbortWithError(http.StatusInternalServerError, err)
			}
		}

		if strings.ToLower(c.Param("format")) == ".json" {
			c.JSON(http.StatusOK, gin.H{
				"tracks":   tracks,
				"playlist": playlist,
			})
			return
		}

		c.HTML(http.StatusOK, "playlist.tmpl", gin.H{
			"tracks":   tracks,
			"playlist": playlist,
		})
	})
}

func loginHandler(_ persistence.CacheStore) func(c *gin.Context) {
	return func(c *gin.Context) {
		// Check if we already have a token, meaning we're already logged in
		if !auth.NeedsAuth(c) {
			sessionID := uuid.New().String()
			c.Redirect(http.StatusTemporaryRedirect, spotifyAuthenticator.AuthURL(sessionID))
		}

		c.Redirect(http.StatusTemporaryRedirect, "/home")
	}
}

func logoutHandler(_ persistence.CacheStore) func(c *gin.Context) {
	return func(c *gin.Context) {
		if auth.LoggedIn(c) {
			if err := auth.LogOut(c); err != nil {
				c.AbortWithError(http.StatusInternalServerError, err)
			}
		}

		c.Redirect(http.StatusTemporaryRedirect, "/")
	}
}

func authRedirectHandler(_ persistence.CacheStore) func(c *gin.Context) {
	return func(c *gin.Context) {
		sessionID := c.Query("state")
		token, err := spotifyAuthenticator.Token(c.Request.Context(), sessionID, c.Request)
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
			return
		}

		err = auth.StoreSpotifyToken(token, sessionID, c)
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
		}
		c.Redirect(http.StatusTemporaryRedirect, "/home")
	}
}

func getClient(c *gin.Context) (*spotify.Client, error) {
	token, err := auth.GetSpotifyToken(c)
	if err != nil {
		return nil, err
	}

	httpClient := spotifyAuthenticator.Client(c, token)
	return spotify.New(httpClient), nil
}
