import { Router, Route } from '@vaadin/router'; 
import './app-root';

const routes: Route[] = [
  {
    path: '/',
    component: 'app-root',
  },
  {
    path: '/login',
    component: 'tag-login',
    action: async () => {
      await import('./pages/tag-login');
    }
  },
  {
    path: '/playlists',
    component: 'tag-playlists',
    action: async () => {
      await import('./pages/tag-playlists');
    }
  },
  {
    path: '/playlists/:id',
    component: 'tag-playlist',
    action: async () => {
      await import('./pages/tag-playlist');
    }
  }
]

const outlet = document.getElementById('outlet');
export const router = new Router(outlet);
router.setRoutes(routes);