import {
  Tag,
  Users,
  Settings,
  Bookmark,
  SquarePen,
  LayoutGrid,
  LucideIcon
} from "lucide-react";

type Submenu = {
  href: string;
  label: string;
  active?: boolean;
};

type Menu = {
  href: string;
  label: string;
  active?: boolean;
  icon: LucideIcon;
  submenus?: Submenu[];
};

type Group = {
  groupLabel: string;
  menus: Menu[];
};

export function getMenuList(pathname: string): Group[] {
  return [
    {
      groupLabel: "",
      menus: [
        {
          href: "/dashboard",
          label: "Dashboard",
          icon: LayoutGrid,
          submenus: []
        }
      ]
    },
    {
      groupLabel: "Contents",
      menus: [
        {
          href: "/tables",
          label: "Tables",
          icon: SquarePen
        },
        {
          href: "/customers",
          label: "Customers",
          icon: Users
        },
        {
          href: "/chat",
          label: "Chat",
          icon: Bookmark
        }
      ]
    },
    {
      groupLabel: "Settings",
      menus: [
        {
          href: "/account",
          label: "Account",
          icon: Settings
        }
      ]
    }
  ];
}
