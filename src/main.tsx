import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { Space, Layout } from "antd";
const { Header, Content, Footer } = Layout;

// Local imports
import "./index.css";
import Login from "./pages/login.tsx";
import HomePage from "./pages/home.tsx";
import Nav from "./pages/components/nav.tsx";
import Playlists from "./pages/playlists.tsx";
import Playlist from "./pages/playlist.tsx";
import PlaylistsModel from "./models/playlists";

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
    errorElement: <>fuck</>,
  },
  {
    path: "/login",
    element: <Login />,
    errorElement: <>fuck</>,
  },
  {
    path: "/playlists",
    element: <Playlists />,
    errorElement: <>fuck</>,
    loader: async () => {
      return await PlaylistsModel.getPlaylists();
    }
  },
  {
    path: "/playlist/:playlistID",
    element: <Playlist />,
    errorElement: <>fuck</>,
    loader: async ({ params }) => {
      if (params.playlistID != null && params.playlistID != "") {
        return await PlaylistsModel.getPlaylist(params.playlistID)
      }
    },
  }
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Space direction="vertical" style={{ width: "100%" }} size={[0, 48]}>
      <Header>
        <Nav />
      </Header>
      <Content style={{ padding: "0 50px" }}>
        <RouterProvider router={router} />
      </Content>
      <Footer>Footsie</Footer>
    </Space>
  </React.StrictMode>
);
