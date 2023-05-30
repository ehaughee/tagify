import Cookies from 'js-cookie';
import { add } from 'date-fns';
import { useEffect, useState } from 'react';

const ACCESS_TOKEN_COOKIE_NAME = 'tagify_access_token';

export default function HomePage() {
  const [accessToken, setAccessToken]= useState('none')

  useEffect(() => {
    setAccessToken(getAccessToken() ?? "fuck")

    function getAccessToken(): string | null {
      let token = null;
    
      // Check cookie for access token
      const cookieAccessToken = getAccessTokenCookie();
      if (cookieAccessToken) {
        token = cookieAccessToken;
      }
    
      // Check url for access token
      const urlAccesstoken = getHashValueByKey('access_token');
      if (urlAccesstoken) {
        token = urlAccesstoken;
        const urlExpiresIn = getHashValueByKey('expires_in');
        const expiresIn = Number(urlExpiresIn);
    
        // Got access token from URL, save in cookie
        setAccessTokenCookie(urlAccesstoken, expiresIn)
      }
    
      return token;
    }
  }, [accessToken]);

  return (
    <>
      {`Hello, ${accessToken}`}
    </>
  )

  
  function getHashValueByKey(key: string) {
    const parsedHash = new URLSearchParams(
      window.location.hash.substring(1) // skip the first char (#)
    );
    return parsedHash.get(key);
  }
  
  function getAccessTokenCookie() {
    return Cookies.get(ACCESS_TOKEN_COOKIE_NAME);
  }
  
  function setAccessTokenCookie(token: string, expiresInSeconds: number) {
    // Default to 1 hour if expiresInSeconds is invalid
    let expiry = add(new Date().getTime(), { hours: 1 });
  
    if (!isNaN(expiresInSeconds)) {
      expiry = add(new Date().getTime(), { seconds: expiresInSeconds });
    }
  
    Cookies.set(ACCESS_TOKEN_COOKIE_NAME, token, { expires: expiry });
  }
}