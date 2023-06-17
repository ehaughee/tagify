import { TagifyPlaylistSimplified } from "../models/playlists";
import Table, { ColumnsType } from "antd/es/table";
import Link from "antd/es/typography/Link";
import { Checkbox } from "antd";
import { useLoaderData } from "react-router-dom";

export default function Playlists() {
  const playlists = useLoaderData() as TagifyPlaylistSimplified[]

  const columns: ColumnsType<SpotifyApi.PlaylistObjectSimplified> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name, { id }) => <Link href={`/playlist/${id}`}>{name}</Link>,
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
