import { useEffect, useState } from "react";
import PlaylistsModel from "../models/playlists";
import Table, { ColumnsType } from "antd/es/table";
import Link from "antd/es/typography/Link";
import { Checkbox } from "antd";

export default function Playlists() {
  const [playlists, setPlaylists] = useState<
    SpotifyApi.PlaylistObjectSimplified[]
  >([]);
  useEffect(() => {
    async function getPlaylists() {
      setPlaylists(await PlaylistsModel.getPlaylists());
    }
    getPlaylists();
  }, []);

  const columns: ColumnsType<SpotifyApi.PlaylistObjectSimplified> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Public",
      dataIndex: "public",
      key: "public",
      render: (isPublic) => <Checkbox checked={isPublic} />,
    },
    {
      title: "Link",
      dataIndex: "href",
      key: "href",
      render: (href) => <Link href={href}>{href}</Link>,
    },
  ];

  return <Table columns={columns} dataSource={playlists} />;
}
