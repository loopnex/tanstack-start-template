import { cn } from '#/lib/utils'

const Sidebar = () => {
  return (
    <aside
      className={cn(
        'hidden w-72 shrink-0 flex-col border-r bg-card transition-[margin] duration-300 md:flex',
      )}
    >
      Sidebar
    </aside>
  )
}

export default Sidebar
