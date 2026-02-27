"use client"

import { useState, useEffect } from "react"
import {
  FolderOpen, Files, Settings, LogOut, Sun, Moon,
  Menu, X, Shield, User as UserIcon, ChevronDown, RefreshCw,
} from "lucide-react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { Profile, FileRecord } from "@/lib/types"
import FileBrowser from "./FileBrowser"
import AdminPanel from "./AdminPanel"

interface AppShellProps {
  currentUser: User
  onLogout: () => void
}

type View = "files" | "admin"

export default function AppShell({ currentUser, onLogout }: AppShellProps) {
  const [view, setView] = useState<View>("files")
  const [files, setFiles] = useState<FileRecord[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [dark, setDark] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(true)

  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const saved = localStorage.getItem("docvault_theme")
    const isDark = saved ? saved === "dark" : prefersDark
    setDark(isDark)
    document.documentElement.classList.toggle("dark", isDark)

    async function init() {
      const supabase = createClient()
      const [{ data: profileData }, { data: filesData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", currentUser.id).single(),
        supabase.from("files").select("*").order("created_at", { ascending: false }),
      ])
      setProfile(profileData as Profile)
      setFiles((filesData as FileRecord[]) ?? [])
      setLoadingFiles(false)
    }
    init()
  }, [currentUser.id])

  function toggleDark() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("docvault_theme", next ? "dark" : "light")
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    onLogout()
  }

  const isAdmin = profile?.role === "admin"
  const canAdmin = profile?.role === "admin"

  const navItems: { id: View; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: "files", label: "Documentos", icon: <Files size={18} /> },
    { id: "admin", label: "Administración", icon: <Settings size={18} />, adminOnly: true },
  ]

  const visibleNavItems = navItems.filter((n) => !n.adminOnly || isAdmin)

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <FolderOpen size={18} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-sidebar-foreground text-sm leading-tight">DocVault</h1>
            <p className="text-xs text-sidebar-foreground/50">Gestor de documentos</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-sidebar-foreground/50 hover:text-sidebar-foreground lg:hidden transition"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {visibleNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setView(item.id); setSidebarOpen(false) }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                view === item.id
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* User info */}
        <div className="px-3 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              {isAdmin ? <Shield size={14} className="text-primary" /> : <UserIcon size={14} className="text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">{profile?.full_name || currentUser.email}</p>
              <p className="text-xs text-sidebar-foreground/50 capitalize">
                {isAdmin ? "Administrador" : "Usuario"}
              </p>
            </div>
            <button onClick={handleLogout} className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition p-1 rounded" aria-label="Cerrar sesión">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border px-4 lg:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground transition p-1"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1">
            <h2 className="font-semibold text-foreground text-balance">
              {view === "files" ? "Documentos e imágenes" : "Panel de administración"}
            </h2>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {view === "files"
                ? `${files.length} archivo(s) disponible(s)`
                : "Gestiona archivos y usuarios"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-full">
              <Files size={12} />
              {loadingFiles ? <RefreshCw size={10} className="animate-spin" /> : files.length} archivos
            </span>

            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
              aria-label={dark ? "Modo claro" : "Modo oscuro"}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* User dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-foreground hover:bg-muted px-2 py-1.5 rounded-lg transition"
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  {isAdmin ? <Shield size={13} className="text-primary" /> : <UserIcon size={13} className="text-primary" />}
                </div>
                <span className="hidden sm:block max-w-24 truncate">{profile?.full_name || currentUser.email}</span>
                <ChevronDown size={14} className="text-muted-foreground" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-lg py-1 w-48">
                    <div className="px-3 py-2 border-b border-border mb-1">
                      <p className="text-xs font-semibold text-foreground truncate">{profile?.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
                      <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded font-medium ${
                        isAdmin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {isAdmin ? "Administrador" : "Usuario"}
                      </span>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => { setView("admin"); setUserMenuOpen(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted transition flex items-center gap-2"
                      >
                        <Settings size={14} className="text-muted-foreground" /> Administración
                      </button>
                    )}
                    <button
                      onClick={() => { handleLogout(); setUserMenuOpen(false) }}
                      className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition flex items-center gap-2"
                    >
                      <LogOut size={14} /> Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          {loadingFiles ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <RefreshCw size={28} className="animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Cargando archivos...</p>
            </div>
          ) : view === "files" ? (
            <FileBrowser
              files={files}
              profile={profile}
              currentUser={currentUser}
              onFilesChange={setFiles}
            />
          ) : isAdmin ? (
            <AdminPanel files={files} currentUser={currentUser} onFilesChange={setFiles} />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Shield size={48} className="text-muted-foreground mb-4" />
              <p className="font-semibold text-foreground">Acceso denegado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Necesitas permisos de administrador para acceder a esta sección.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
