use std::{collections::HashMap, env, str::FromStr, sync::Arc};

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Redirect,
    routing::get,
    Error, Router,
};
use dotenv::dotenv;
use spotify_rs::{
    auth::{CsrfVerifier, NoVerifier, Token, UnAuthenticated},
    client::Client,
    AuthCodeClient, AuthCodeFlow, RedirectUrl,
};
use tokio::sync::RwLock;
use url::Url;

const DEFAULT_PORT: i32 = 3000;
const DEFAULT_REDIRECT_URL: &str = "http://localhost:3000/authed";

#[derive(Clone)]
struct AppState {
    authenticator: Arc<RwLock<AuthCodeClient<CsrfVerifier>>>,
    client: Arc<RwLock<Option<Client<Token, AuthCodeFlow, NoVerifier>>>>,
    auth_url: Arc<RwLock<Url>>,
}

#[tokio::main]
async fn main() {
    dotenv().ok();

    let client_result = get_initial_client();
    if client_result.is_err() {
        panic!(
            "failed to get initial client with error: {}",
            client_result.expect_err("expected an error"),
        );
    }
    let (unauthed_client, auth_url) = client_result.expect("expected a client");

    let state = AppState {
        authenticator: Arc::new(RwLock::new(unauthed_client)),
        client: Arc::new(RwLock::new(None)),
        auth_url: Arc::new(RwLock::new(auth_url)),
    };

    let app = Router::new()
        .route("/", get(root))
        .route("/auth", get(auth))
        .route("/authed", get(authed))
        .with_state(state);

    let port = get_port();
    let bind_addr = format!("0.0.0.0:{}", port);

    axum::Server::bind(&bind_addr.parse().unwrap())
        .serve(app.into_make_service())
        .await
        .unwrap();
}

async fn root() -> &'static str {
    return "hello, world!";
}

async fn auth(State(state): State<AppState>) -> Result<Redirect, StatusCode> {
    return Ok(Redirect::to(state.auth_url.read().await.as_str()));
}

async fn authed(
    Query(params): Query<HashMap<String, String>>,
    State(state): State<AppState>,
) -> Result<Redirect, StatusCode> {
    if params.get("code").is_none() {
        println!("error retrieving auth code");
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    if params.get("state").is_none() {
        println!("error retrieving CSRF state");
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    let authenticator = state.authenticator.read().await;
    let authed_client = match authenticator
        .authenticate(params.get("code").unwrap(), params.get("state").unwrap())
        .await
    {
        Ok(c) => c,
        Err(e) => {
            println!("error while attempting to authenticate: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let mut client = state.client.write().await;
    *client = Some(authed_client);
    return Ok(Redirect::to("/"));
}

fn get_initial_client() -> Result<(Client<UnAuthenticated, AuthCodeFlow, CsrfVerifier>, Url), Error>
{
    let redirect_url = RedirectUrl::new(get_redirect_url().to_owned());
    if redirect_url.is_err() {
        return Err(Error::new(format!(
            "error creating redirect URL: {}",
            redirect_url.expect_err("expected an error"),
        )));
    }
    let auto_refresh = true;

    // TODO: Expand these scopes as necessary
    let scopes = vec!["user-library-read", "playlist-read-private"];

    let auth_code_flow = AuthCodeFlow::new(get_client_id(), get_client_secret(), scopes);
    let (unauthed_client, url) =
        AuthCodeClient::new(auth_code_flow, redirect_url.unwrap(), auto_refresh);

    return Ok((unauthed_client, url));
}

fn get_port() -> i32 {
    return match env::var("TAGIFY_PORT") {
        Ok(port) => FromStr::from_str(&port).unwrap_or(DEFAULT_PORT),
        Err(_) => DEFAULT_PORT,
    };
}

fn get_redirect_url() -> String {
    return match env::var("SPOTIFY_REDIRECT_URL") {
        Ok(url) => url,
        Err(_) => DEFAULT_REDIRECT_URL.to_string(),
    };
}

fn get_client_id() -> String {
    return match env::var("SPOTIFY_CLIENT_ID") {
        Ok(client_id) => client_id,
        Err(e) => panic!("failed to get Spotify client ID: {:?}", e),
    };
}

fn get_client_secret() -> String {
    return match env::var("SPOTIFY_CLIENT_SECRET") {
        Ok(client_id) => client_id,
        Err(e) => panic!("failed to get Spotify client ID: {:?}", e),
    };
}
