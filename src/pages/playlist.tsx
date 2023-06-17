import { Table } from "antd"
import { ColumnsType } from "antd/es/table"
import { useLoaderData } from "react-router-dom"
import { TagifyPlaylist } from "../models/playlists";


export default function Playlist() {
  const playlist = useLoaderData() as TagifyPlaylist
  const items = playlist.tracks.items.map((track) => {
    return {
      key: track.track.id,
      ...track,
    }
  })

  const columns: ColumnsType<SpotifyApi.PlaylistTrackObject> = [
    // playlist.tracks.items[0].track.artists[0].name
    {
      title: "Title",
      dataIndex: ["track", "name"],
      key: "title",
    },
    {
      title: "Artists",
      dataIndex: ["track", "artists"],
      key: "artists",
      render: (_, { track }) => {
        const artistNameList = track.artists.reduce(
          (alist, artist) => {
            alist.push(artist.name);
            return alist; 
          }, []
        );
        return artistNameList.join(" ");
      }
    }
  ];
  
  return <Table columns={columns} dataSource={items} />;
}