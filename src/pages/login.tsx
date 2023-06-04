import { Button } from "antd";
import { LoginOutlined } from "@ant-design/icons";

export default function Login() {
  // TODO: Should this be hard-coded lol?  Probably should be in an .env file...
  const clientId = "9c05b721a93e422fa8e7fda9a1daeb54";
  const responseType = "token";
  const redirectUri = `http://${window.location.host}`;
  const scopes = [
    "user-read-private",
    "user-read-email",
    "playlist-read-private",
    "playlist-modify-private",
    "playlist-modify-public",
    "playlist-read-collaborative",
  ];
  const authUrl =
    "https://accounts.spotify.com/authorize" +
    `?client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=${responseType}` +
    `&scope=${getScopeUriString()}` +
    `&state=${"TODO"}`;

  return (
    <Button
      type="primary"
      shape="round"
      icon={<LoginOutlined />}
      href={authUrl}
      target="_self"
    >
      Login
    </Button>
  );

  function getScopeUriString() {
    return scopes.join(encodeURIComponent(" "));
  }
}
