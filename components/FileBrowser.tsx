"use client"

import { useState, useMemo } from "react"
import { Search, Grid3X3, List, Download, Eye, Trash2, SortAsc, SortDesc, Filter, RefreshCw } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { FileRecord, Profile } from "@/lib/types"
import FileIcon, { formatSize, formatDate } from "./FileIcon"
import type { FileCategory } from "./FileIcon"
import FileViewerModal from "./FileViewerModal"

interface FileBrowserProps {
  files: FileRecord[]
  profile: Profile | null
  currentUser: User
  onFilesChange: (files: FileRecord[]) => void
}

type SortField = "name" | "created_at" | "file_size" | "file_type"
type SortDir = "asc" | "desc"

const CATEGORIES: { value: FileCategory | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "image", label: "Imágenes" },
  { value: "pdf", label: "PDF" },
  { value: "word", label: "Word" },
  { value: "excel", label: "Excel" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "zip", label: "ZIP" },
  { value: "text", label: "Texto/Código" },
  { value: "other", label: "Otros" },
]

export default function FileBrowser({ files, profile, currentUser, onFilesChange }: FileBrowserProps) {
  const [view, setView] = useState<"grid" | "list">("grid")
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<FileCategory | "all">("all")
  const [sortField, setSortField] = useState<SortField>("created_at")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const canEdit = profile?.role === "admin"
  const canDelete = profile?.role === "admin"

  const filtered = useMemo(() => {
    let list = [...files]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.description ?? "").toLowerCase().includes(q) ||
          f.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    if (category !== "all") list = list.filter((f) => f.file_type === category)
    list.sort((a, b) => {
      let cmp = 0
      if (sortField === "name") cmp = a.name.localeCompare(b.name)
      else if (sortField === "created_at") cmp = a.created_at.localeCompare(b.created_at)
      else if (sortField === "file_size") cmp = a.file_size - b.file_size
      else if (sortField === "file_type") cmp = a.file_type.localeCompare(b.file_type)
      return sortDir === "asc" ? cmp : -cmp
    })
    return list
  }, [files, search, category, sortField, sortDir])

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortField(field); setSortDir("asc") }
  }

  async function getSignedUrl(filePath: string): Promise<string> {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(filePath, 60 * 60) // 1 hour
    if (error || !data) throw error
    return data.signedUrl
  }

  async function handleDownload(f: FileRecord, e: React.MouseEvent) {
    e.stopPropagation()
    setLoadingUrl(f.id)
    try {
      const url = await getSignedUrl(f.file_path)
      const a = document.createElement("a")
      a.href = url
      a.download = f.name
      a.target = "_blank"
      a.click()
    } finally {
      setLoadingUrl(null)
    }
  }

  async function openViewer(f: FileRecord) {
    setLoadingUrl(f.id)
    try {
      const url = await getSignedUrl(f.file_path)
      setSelectedFile({ ...f, public_url: url })
    } finally {
      setLoadingUrl(null)
    }
  }

  async function handleDelete(id: string, filePath: string) {
    setDeletingId(id)
    const supabase = createClient()
    try {
      await supabase.storage.from("documents").remove([filePath])
      await supabase.from("files").delete().eq("id", id)
      onFilesChange(files.filter((f) => f.id !== id))
    } finally {
      setDeletingId(null)
      setConfirmDelete(null)
    }
  }

  function handleUpdated(updated: FileRecord) {
    onFilesChange(files.map((f) => (f.id === updated.id ? updated : f)))
    setSelectedFile(updated)
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, descripción o etiqueta..."
            className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
          />
        </div>

        {/* Category filter */}
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as FileCategory | "all")}
            className="pl-8 pr-8 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer transition"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* View toggle */}
        <div className="flex border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setView("grid")}
            className={`p-2 transition ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            aria-label="Vista cuadrícula"
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-2 transition ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            aria-label="Vista lista"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "archivo" : "archivos"}
        {search || category !== "all" ? " encontrados" : " en total"}
      </p>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
            <Search size={28} className="text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">No se encontraron archivos</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search || category !== "all"
              ? "Intenta con otros filtros"
              : "El administrador aún no ha subido ningún archivo"}
          </p>
        </div>
      )}

      {/* Grid view */}
      {view === "grid" && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((f) => (
            <div
              key={f.id}
              onClick={() => openViewer(f)}
              className="group bg-card border border-border rounded-xl p-4 flex flex-col gap-3 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
            >
              <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted/50 flex items-center justify-center">
                {loadingUrl === f.id ? (
                  <RefreshCw size={24} className="animate-spin text-muted-foreground" />
                ) : (
                  <FileIcon category={f.file_type as FileCategory} size="xl" />
                )}
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate leading-tight">{f.name}</p>
                {f.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{f.description}</p>
                )}
                {f.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {f.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{formatSize(f.file_size)} · {formatDate(f.created_at)}</p>
              </div>
              <div className="flex gap-1 mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); openViewer(f) }}
                  className="flex-1 flex items-center justify-center gap-1 text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground py-1.5 rounded-lg transition"
                >
                  <Eye size={12} /> Ver
                </button>
                <button
                  onClick={(e) => handleDownload(f, e)}
                  className="flex-1 flex items-center justify-center gap-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary py-1.5 rounded-lg transition"
                >
                  <Download size={12} /> Bajar
                </button>
                {canDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(f.id) }}
                    className="flex items-center justify-center text-xs bg-destructive/10 hover:bg-destructive/20 text-destructive px-2 py-1.5 rounded-lg transition"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {view === "list" && filtered.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-4 py-3 border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="w-10">Tipo</span>
            <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-foreground transition text-left">
              Nombre {sortField === "name" && (sortDir === "asc" ? <SortAsc size={12} /> : <SortDesc size={12} />)}
            </button>
            <button onClick={() => toggleSort("file_size")} className="flex items-center gap-1 hover:text-foreground transition hidden sm:flex">
              Tamaño {sortField === "file_size" && (sortDir === "asc" ? <SortAsc size={12} /> : <SortDesc size={12} />)}
            </button>
            <button onClick={() => toggleSort("created_at")} className="flex items-center gap-1 hover:text-foreground transition hidden md:flex">
              Fecha {sortField === "created_at" && (sortDir === "asc" ? <SortAsc size={12} /> : <SortDesc size={12} />)}
            </button>
            <span>Acciones</span>
          </div>

          {filtered.map((f, i) => (
            <div
              key={f.id}
              className={`grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-4 py-3 cursor-pointer hover:bg-muted/50 transition ${i < filtered.length - 1 ? "border-b border-border" : ""}`}
              onClick={() => openViewer(f)}
            >
              <FileIcon category={f.file_type as FileCategory} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                {f.description && <p className="text-xs text-muted-foreground truncate">{f.description}</p>}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block whitespace-nowrap">{formatSize(f.file_size)}</span>
              <span className="text-xs text-muted-foreground hidden md:block whitespace-nowrap">{formatDate(f.created_at)}</span>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                {loadingUrl === f.id ? (
                  <RefreshCw size={15} className="animate-spin text-muted-foreground mx-1" />
                ) : (
                  <button onClick={(e) => handleDownload(f, e)} className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition" aria-label="Descargar">
                    <Download size={15} />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => setConfirmDelete(f.id)}
                    disabled={deletingId === f.id}
                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition disabled:opacity-50"
                    aria-label="Eliminar"
                  >
                    {deletingId === f.id ? <RefreshCw size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-foreground mb-2">Confirmar eliminación</h3>
            <p className="text-sm text-muted-foreground mb-5">¿Eliminar este archivo? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const f = files.find((x) => x.id === confirmDelete)
                  if (f) handleDelete(f.id, f.file_path)
                }}
                disabled={!!deletingId}
                className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm font-medium py-2 rounded-lg transition disabled:opacity-60"
              >
                {deletingId ? "Eliminando..." : "Eliminar"}
              </button>
              <button onClick={() => setConfirmDelete(null)} className="flex-1 border border-border text-sm font-medium py-2 rounded-lg hover:bg-muted transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Viewer modal */}
      {selectedFile && (
        <FileViewerModal
          file={selectedFile}
          canEdit={canEdit}
          onClose={() => setSelectedFile(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  )
}
