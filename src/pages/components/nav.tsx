import { Menu } from "antd";
import { ItemType, MenuItemType } from "antd/es/menu/hooks/useItems";

function getNavLink(name: string, hrefOverride?: string) {
  return <a href={hrefOverride ?? `/${name.toLocaleLowerCase()}`}>{name}</a>;
}

function getMenuItems(): ItemType<MenuItemType>[] {
  return [
    {
      key: "home",
      label: getNavLink("Home", "/"),
    },
    {
      key: "login",
      label: getNavLink("Login"),
    },
    {
      key: "playlists",
      label: getNavLink("Playlists"),
    },
  ];
}

export default function Nav() {
  return (
    <Menu
      theme="dark"
      mode="horizontal"
      defaultSelectedKeys={["1"]}
      items={getMenuItems()}
    />
  );
}
