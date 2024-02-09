package main

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	spotifyauth "github.com/zmb3/spotify/v2/auth"
)

const (
	// TODO: Parameterize this
	authRedirectURL    = "http://localhost:8080/auth_redir"
	SPOTIFY_ID_ENV     = "SPOTIFY_ID"
	SPOTIFY_SECRET_ENV = "SPOTIFY_SECRET"
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
		// spotifyauth.WithClientID(os.Getenv(SPOTIFY_ID_ENV)),
		// spotifyauth.WithClientSecret(os.Getenv(SPOTIFY_SECRET_ENV)),
	)

	r := gin.Default()

	setupRoutes(r)

	r.Run()
}

func setupRoutes(r *gin.Engine) {
	r.GET("/ping", pingHandler)
	r.GET("/auth_redir", authRedirectHandler)
	r.GET("/login", loginHandler)
}

func pingHandler(c *gin.Context) {
	c.JSON(200, gin.H{
		"message": "pong",
	})
}

func loginHandler(c *gin.Context) {
	// TODO: Introduce sessions for handling state strings
	log.Printf("Auth URL: %s", auth.AuthURL("test"))
	c.Redirect(http.StatusMovedPermanently, auth.AuthURL("test"))
}

func authRedirectHandler(c *gin.Context) {
	token, err := auth.Token(c.Request.Context(), "test", c.Request)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": err,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
	})
}
