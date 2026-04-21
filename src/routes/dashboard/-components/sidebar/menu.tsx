import MenuCollapsible from './menu-collapsible'
import MenuCollapsibleItem from './menu-collapsible-item'
import MenuItem from './menu-item'
import { menuList } from './menu-list'

const SidebarMenu = () => {
  return (
    <nav className="grow space-y-1.5 overflow-y-auto p-4">
      {menuList.map((menu) => {
        if (menu.submenu && menu.baseUrl) {
          return (
            <MenuCollapsible
              key={menu.id}
              icon={menu.icon}
              title={menu.title}
              baseUrl={menu.baseUrl}
            >
              {menu.submenu.map((submenu) => (
                <MenuCollapsibleItem key={submenu.id} {...submenu} />
              ))}
            </MenuCollapsible>
          )
        }

        if (menu.url) {
          return (
            <MenuItem
              key={menu.id}
              icon={menu.icon}
              title={menu.title}
              url={menu.url}
            />
          )
        }

        return null
      })}
    </nav>
  )
}

export default SidebarMenu
