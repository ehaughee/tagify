package auth

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
)

const (
	RedirectUrlEnv = "TAGIFY_AUTH_REDIRECT_URL"

	spotifySessionIDKey           = "spotify-session-id"
	spotifyTokenSessionKey        = "spotify-token"
	spotifyAccessTokenSessionKey  = "spotify-access-token"
	spotifyRefreshTokenSessionKey = "spotify-refresh-token"
)

func GetAuthRedirectURL() string {
	if redirectUrl := os.Getenv(RedirectUrlEnv); redirectUrl != "" {
		return redirectUrl
	}

	return "http://localhost:8080/auth_redir"
}

func NeedsAuth(c *gin.Context) bool {
	return LoggedIn(c) && !SpotifyTokenNearExpiry(c)
}

func LoggedIn(c *gin.Context) bool {
	token, err := GetSpotifyToken(c)
	return err == nil && token != nil
}

func LogOut(c *gin.Context) error {
	session := sessions.Default(c)
	session.Clear()

	// Invalidate the session
	session.Options(sessions.Options{
		MaxAge: -1,
	})

	return session.Save()
}

func GetSpotifyToken(c *gin.Context) (*oauth2.Token, error) {
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

func StoreSpotifyToken(token *oauth2.Token, sessionID string, c *gin.Context) error {
	session := sessions.Default(c)
	if tokenBytes, err := serializeToken(token); err != nil {
		return fmt.Errorf("failed to serialize Spotify token with error: %w", err)
	} else {
		session.Set(spotifyTokenSessionKey, string(tokenBytes))
		session.Set(spotifySessionIDKey, sessionID)
	}

	session.Options(sessions.Options{
		// Invalidate session at token expiry time
		// TODO: Figure out why this is very wrong
		MaxAge: int(time.Until(token.Expiry)),
	})
	return session.Save()
}

func SpotifyTokenNearExpiry(c *gin.Context) bool {
	token, err := GetSpotifyToken(c)
	// Return true if the token will NOT be valid for at least another 5 minutes
	return err == nil && !token.Expiry.After(time.Now().Add(5*time.Minute))
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
