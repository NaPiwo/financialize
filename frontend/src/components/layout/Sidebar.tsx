
import { LayoutDashboard, LineChart, Target, Settings, TrendingUp } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function Sidebar() {
    // const [active, setActive] = useState('dashboard')

    const navItems = [
        { id: 'dashboard', label: 'Now', icon: LayoutDashboard, path: '/' },
        { id: 'tracker', label: 'Tracker', icon: LineChart, path: '/tracker' },
        { id: 'simulation', label: 'Future', icon: TrendingUp, path: '/simulation' }, // Changed Icon to TrendingUp to avoid dupe if needed, or keep
        { id: 'planning', label: 'Reverse', icon: Target, path: '/planning' },
        { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
    ]

    return (
        <aside className="h-screen w-20 lg:w-64 border-r-2 border-border bg-card flex flex-col p-4 fixed left-0 top-0 z-10 transition-all duration-300">
            <div className="flex items-center justify-center mb-8">
                <img src="/logo.png" alt="Financialize" className="h-12 lg:h-14 object-contain [mix-blend-mode:multiply] dark:[mix-blend-mode:screen] dark:brightness-[1.5]" />
            </div>

            <nav className="space-y-2 flex-1">
                {navItems.map((item) => {
                    const Icon = item.icon
                    return (
                        <NavLink
                            key={item.id}
                            to={item.path}
                            className={({ isActive }) => cn(
                                "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 border-2",
                                isActive
                                    ? "bg-secondary border-border shadow-neobrutal-sm translate-x-1"
                                    : "border-transparent hover:bg-muted hover:border-border hover:shadow-neobrutal-sm text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon className="h-6 w-6" strokeWidth={2.5} />
                            <span className="font-medium hidden lg:block">{item.label}</span>
                        </NavLink>
                    )
                })}
            </nav>

            <div className="mt-auto px-2">
                <div className="p-4 bg-accent/50 rounded-xl border-2 border-border border-dashed text-center hidden lg:block">
                    <p className="text-xs font-semibold text-muted-foreground">v1.1.0</p>
                </div>
            </div>
        </aside>
    )
}
