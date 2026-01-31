'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/contexts/auth-context'
import { cn, getInitials } from '@/lib/utils'
import {
  BarChart3,
  Users,
  FlaskConical,
  Settings,
  Menu,
  X,
  Bell,
  Search,
  User,
  LogOut,
  Home,
  CreditCard,
  Shield,
  UserCheck,
  Swords
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Personas', href: '/dashboard/personas', icon: Users },
  { name: 'Experiments', href: '/dashboard/experiments', icon: FlaskConical },
  { name: 'Competitors', href: '/dashboard/competitors', icon: Swords },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

const adminNavigation = [
  { name: 'Admin Panel', href: '/admin', icon: Shield },
]

const isAdmin = (role: string) => role === 'admin'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const handleSignOut = () => {
    logout()
  }

  return (
    <ProtectedRoute>
      <div className="h-screen flex bg-gray-50">
      {/* Mobile sidebar */}
      <div className={cn(
        'fixed inset-0 flex z-40 lg:hidden',
        sidebarOpen ? 'block' : 'hidden'
      )}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <SidebarContent />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={cn(
        'hidden lg:flex lg:flex-shrink-0 transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}>
        <div className="flex flex-col w-full">
          <SidebarContent />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center space-x-4">
              <button
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </button>

              {/* Desktop sidebar toggle */}
              <button
                className="hidden lg:block p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="lg:hidden flex items-center space-x-2">
                <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                  <span className="text-white font-bold text-sm">P</span>
                </div>
                <span className="font-semibold text-gray-900">PersonaLab Pro</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="hidden md:flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-gray-500">Connected</span>
              </div>

              {/* Search */}
              <div className="hidden md:block relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search personas, experiments..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-64"
                />
              </div>

              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  3
                </span>
              </Button>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-3 p-2">
                    <div className="hidden md:block text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {user?.name}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center">
                        <span>{user?.email}</span>
                        {isAdmin(user?.role || '') && (
                          <Badge variant="secondary" className="ml-2 text-xs">Admin</Badge>
                        )}
                      </div>
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={undefined} />
                      <AvatarFallback>
                        {getInitials(user?.name || user?.email || 'User')}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/billing">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Billing
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/team">
                      <UserCheck className="mr-2 h-4 w-4" />
                      Team
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin(user?.role || '') && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin">
                          <Shield className="mr-2 h-4 w-4" />
                          Admin Panel
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
    </ProtectedRoute>
  )
}

function SidebarContent() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [sidebarCollapsed] = useState(false)

  const allNavigation = [
    ...navigation,
    ...(isAdmin(user?.role || '') ? adminNavigation : [])
  ]

  return (
    <div className="flex flex-col h-full bg-white border-r">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          {!sidebarCollapsed && (
            <span className="text-xl font-bold text-gray-900">PersonaLab Pro</span>
          )}
        </Link>
      </div>

      {/* Subscription Status */}
      {!sidebarCollapsed && user?.tenant && (
        <div className="px-4 py-3 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900 capitalize">
                {user.tenant.plan} Plan
              </div>
              <div className="text-xs text-gray-500">
                Active
              </div>
            </div>
            <Badge
              variant="default"
              className="text-xs"
            >
              Active
            </Badge>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {allNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                sidebarCollapsed && 'justify-center'
              )}
              title={sidebarCollapsed ? item.name : undefined}
            >
              <item.icon className={cn('h-5 w-5', !sidebarCollapsed && 'mr-3')} />
              {!sidebarCollapsed && item.name}
            </Link>
          )
        })}
      </nav>

      {/* Quick Actions */}
      {!sidebarCollapsed && (
        <div className="px-4 py-4 border-t bg-gray-50">
          <div className="space-y-2">
            <Link href="/dashboard/personas/new">
              <Button size="sm" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                New Persona
              </Button>
            </Link>
            <Link href="/dashboard/experiments/new">
              <Button size="sm" variant="outline" className="w-full justify-start">
                <FlaskConical className="mr-2 h-4 w-4" />
                New Experiment
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}