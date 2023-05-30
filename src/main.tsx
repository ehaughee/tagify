import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

// Theme imports
import { Space, Layout } from 'antd';
const { Header, Content, Footer } = Layout;

// Local imports
import './index.css'
import Login from './pages/login.tsx';
import HomePage from './pages/home.tsx';
import Nav from './pages/components/nav.tsx';
import Playlists from './pages/playlists.tsx';

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
    errorElement: <>fuck</>,
  },
  {
    path: '/login',
    element: <Login />,
    errorElement: <>fuck</>,
  },
  {
    path: '/playlists',
    element: <Playlists />,
    errorElement: <>fuck</>,
  },
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Space direction="vertical" style={{ width: '100%' }} size={[0, 48]}>
      <Header>
        <Nav />
      </Header>
      <Content className="site-layout" style={{ padding: '0 50px' }}>
        <RouterProvider router={router}  />
      </Content>
      <Footer>
        Footsie
      </Footer>
    </Space>
  </React.StrictMode>,
)
