import {
  ChartBar,
  LayoutGrid,
  Settings,
  SquarePen,
  UserRound,
} from 'lucide-react'

export interface SubMenuItem {
  id: number
  title: string
  url: string
}

export interface MenuItem {
  id: number
  title: string
  icon: React.ReactElement
  url?: string
  baseUrl?: string
  submenu?: SubMenuItem[]
}

export interface MenuGroup {
  label: string
  items: MenuItem[]
}

export const menuGroups: MenuGroup[] = [
  {
    label: 'General',
    items: [
      {
        id: 1,
        title: 'Dashboard',
        icon: <LayoutGrid className="icon" />,
        url: '/dashboard',
      },
    ],
  },
  {
    label: 'Content',
    items: [
      {
        id: 2,
        title: 'Categories',
        icon: <ChartBar className="icon" />,
        url: '/dashboard/categories',
      },
      {
        id: 3,
        title: 'Articles',
        icon: <SquarePen className="icon" />,
        baseUrl: '/dashboard/articles',
        submenu: [
          { id: 1, title: 'All Articles', url: '/dashboard/articles' },
          { id: 2, title: 'Add Article', url: '/dashboard/articles/add' },
        ],
      },
    ],
  },
  {
    label: 'Management',
    items: [
      {
        id: 4,
        title: 'Users',
        icon: <UserRound className="icon" />,
        baseUrl: '/dashboard/users',
        submenu: [
          { id: 1, title: 'All Users', url: '/dashboard/users' },
          { id: 2, title: 'Add User', url: '/dashboard/users/add' },
        ],
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        id: 5,
        title: 'Settings',
        icon: <Settings className="icon" />,
        url: '/dashboard/settings',
      },
    ],
  },
]
