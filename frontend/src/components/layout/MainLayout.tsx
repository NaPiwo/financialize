
import { Sidebar } from './Sidebar'
import { motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'

interface MainLayoutProps {
    children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
    const location = useLocation()

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            <Sidebar />
            <main className="pl-20 lg:pl-64 min-h-screen transition-all duration-300">
                <motion.div
                    key={location.pathname}
                    className="w-full p-6 lg:p-10"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                    {children}
                </motion.div>
            </main>
        </div>
    )
}
