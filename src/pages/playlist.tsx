import { Table } from "antd"
import { ColumnsType } from "antd/es/table"
import { useLoaderData } from "react-router-dom"
import PlaylistsModel, { TagifyPlaylist, TagifyPlaylistTrack } from "../models/playlists";
import TagSelect, { Tag } from "./components/tagSelect";
import { useEffect, useState } from "react";


export default function Playlist() {
  const [ tags, setTags ] = useState<Tag[]>([])

  useEffect(() => {
    PlaylistsModel.getPlaylists()
      .then(playlists => {
        setTags(playlists.map(playlist => ({ name: playlist.name, id: playlist.id })))
      })
  }, [tags])

  const playlist = useLoaderData() as TagifyPlaylist

  const columns: ColumnsType<TagifyPlaylistTrack> = [
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
    },
    {
      title: "Tags",
      key: "tags",
      render: (_, track) => {
        return <TagSelect selectedTags={track.tags} tags={tags} />
      }
    }
  ];
  
  return <Table columns={columns} dataSource={[...playlist.tracks]} />;
}