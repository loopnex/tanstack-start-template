import MenuCollapsible from './menu-collapsible'
import MenuCollapsibleItem from './menu-collapsible-item'
import MenuItem from './menu-item'
import type { MenuGroup } from './menu-list'
import { menuGroups } from './menu-list'

const SidebarMenu = ({ groups = menuGroups }: { groups?: MenuGroup[] }) => {
  return (
    <nav className="grow space-y-5 overflow-y-auto p-4">
      {groups.map((group) =>
        group.items.length === 0 ? null : (
          <div key={group.label}>
            <p className="mb-2.5 text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
              {group.label}
            </p>
            <div className="space-y-1.5">
              {group.items.map((menu) => {
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
            </div>
          </div>
        ),
      )}
    </nav>
  )
}

export default SidebarMenu
