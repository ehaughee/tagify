package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	spotifyauth "github.com/zmb3/spotify/v2/auth"
)

const (
	// TODO: Parameterize this
	authRedirectURL = "http://localhost:8080/auth_redir"

	SPOTIFY_ID_ENV     = "SPOTIFY_ID"
	SPOTIFY_SECRET_ENV = "SPOTIFY_SECRET"

	COOKIE_AUTH_KEY = "COOKIE_AUTH_KEY"

	sessionTokenKey = "session-token"
)

var (
	auth *spotifyauth.Authenticator
)

func main() {
	// Load dev environment variables
	// TODO: Conditionally do this depending on the Gin mode (dev vs release)
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	// Create new Spotify Authenticator.  This must be done after we've loaded the environment variables.
	auth = spotifyauth.New(
		spotifyauth.WithRedirectURL(authRedirectURL),
		spotifyauth.WithScopes(spotifyauth.ScopeUserReadPrivate),
	)

	r := gin.Default()

	// Setup session management
	cookieAuthKey := os.Getenv(COOKIE_AUTH_KEY)
	if cookieAuthKey == "" {
		log.Fatalf("Required environment variable %q was empty", COOKIE_AUTH_KEY)
	}
	store := cookie.NewStore([]byte(cookieAuthKey))
	r.Use(sessions.Sessions("user_sessions", store))

	setupRoutes(r)

	r.Run()
}

func setupRoutes(r *gin.Engine) {
	r.GET("/", rootHandler)
	r.GET("/home", homeHandler)
	r.GET("/ping", pingHandler)
	r.GET("/auth_redir", authRedirectHandler)
	r.GET("/login", loginHandler)
	r.GET("/logout", logoutHandler)
}

func rootHandler(c *gin.Context) {
	c.Data(http.StatusOK, "text/plain", []byte("ok"))
}

func homeHandler(c *gin.Context) {
	if !loggedIn(c) {
		c.Redirect(http.StatusTemporaryRedirect, "/login")
	}

	c.JSON(http.StatusOK, gin.H{
		"token": getSessionToken(c),
	})
}

func pingHandler(c *gin.Context) {
	c.JSON(200, gin.H{
		"message": "pong",
	})
}

func loginHandler(c *gin.Context) {
	// Check if we already have a token, meaning we're already logged in
	// TODO: Handle token expiry as well as near-expiry
	if !loggedIn(c) {
		log.Printf("Auth URL: %s", auth.AuthURL("test"))
		c.Redirect(http.StatusMovedPermanently, auth.AuthURL("test"))
	}

	c.Redirect(http.StatusMovedPermanently, "/home")
}

func logoutHandler(c *gin.Context) {
	if loggedIn(c) {
		logOut(c)
	}

	c.Redirect(http.StatusTemporaryRedirect, "/")
}

func authRedirectHandler(c *gin.Context) {
	token, err := auth.Token(c.Request.Context(), "test", c.Request)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": err,
		})
		return
	}

	setSessionToken(token.AccessToken, c)
	c.Redirect(http.StatusTemporaryRedirect, "/home")
}

func loggedIn(c *gin.Context) bool {
	return getSessionToken(c) != ""
}

func getSessionToken(c *gin.Context) string {
	token := sessions.Default(c).Get(sessionTokenKey)
	if token == nil {
		return ""
	}

	return token.(string)
}

func setSessionToken(token string, c *gin.Context) {
	session := sessions.Default(c)
	session.Set(sessionTokenKey, token)
	session.Save()
}

func logOut(c *gin.Context) {
	session := sessions.Default(c)
	session.Delete(sessionTokenKey)
	session.Save()
}
