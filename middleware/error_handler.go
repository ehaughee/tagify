package middleware

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

func ErrorHandler(c *gin.Context) {
	// Call gin.Context.Next here so we make sure the error handler runs after any other
	// pending middleware thus capturing any errors
	c.Next()

	for _, err := range c.Errors {
		log.Printf("ERROR: %v\n", err)
	}

	if len(c.Errors) > 0 {
		c.JSON(http.StatusInternalServerError, "")
	}
}
