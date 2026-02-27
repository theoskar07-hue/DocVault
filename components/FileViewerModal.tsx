"use client"

import { useState, useEffect } from "react"
import { X, Download, Edit2, Check, XCircle, Tag, Calendar, HardDrive, ExternalLink } from "lucide-react"
import type { FileRecord } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import FileIcon, { formatSize, formatDate } from "./FileIcon"
import type { FileCategory } from "./FileIcon"

interface FileViewerModalProps {
  file: FileRecord
  canEdit: boolean
  onClose: () => void
  onUpdated: (file: FileRecord) => void
}

export default function FileViewerModal({ file, canEdit, onClose, onUpdated }: FileViewerModalProps) {
  const [editingDesc, setEditingDesc] = useState(false)
  const [desc, setDesc] = useState(file.description || "")
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(file.name)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  function handleDownload() {
    if (!file.public_url) return
    const a = document.createElement("a")
    a.href = file.public_url
    a.download = file.name
    a.target = "_blank"
    a.click()
  }

  async function saveDesc() {
    setSaving(true)
    const supabase = createClient()
    try {
      const { data } = await supabase.from("files").update({ description: desc }).eq("id", file.id).select().single()
      onUpdated({ ...file, ...(data as FileRecord), public_url: file.public_url })
      setEditingDesc(false)
    } finally {
      setSaving(false)
    }
  }

  async function saveName() {
    if (!name.trim()) return
    setSaving(true)
    const supabase = createClient()
    try {
      const { data } = await supabase.from("files").update({ name: name.trim() }).eq("id", file.id).select().single()
      onUpdated({ ...file, ...(data as FileRecord), public_url: file.public_url })
      setEditingName(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-shrink-0">
          <FileIcon category={file.file_type as FileCategory} size="md" />
          <div className="flex-1 min-w-0">
            {editingName && canEdit ? (
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 text-sm font-semibold bg-background border border-input rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
                <button onClick={saveName} disabled={saving} className="text-primary hover:text-primary/80 transition">
                  <Check size={16} />
                </button>
                <button onClick={() => { setEditingName(false); setName(file.name) }} className="text-muted-foreground hover:text-foreground transition">
                  <XCircle size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h2 className="font-semibold text-foreground truncate text-balance">{file.name}</h2>
                {canEdit && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition"
                    aria-label="Editar nombre"
                  >
                    <Edit2 size={13} />
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground capitalize">{file.file_type}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-lg transition"
            >
              <Download size={14} />
              Descargar
            </button>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition p-1.5 rounded-lg hover:bg-muted"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row gap-0">
          {/* Preview */}
          <div className="flex-1 flex items-center justify-center bg-muted/30 p-6 min-h-48">
            {file.file_type === "image" && file.public_url ? (
              <img
                src={file.public_url}
                alt={file.name}
                className="max-w-full max-h-96 object-contain rounded-lg shadow-md"
              />
            ) : file.file_type === "pdf" && file.public_url ? (
              <iframe
                src={file.public_url}
                title={file.name}
                className="w-full h-96 rounded-lg border border-border"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-center">
                <FileIcon category={file.file_type as FileCategory} size="xl" />
                <div>
                  <p className="font-medium text-foreground">{file.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{formatSize(file.file_size)}</p>
                </div>
                {file.public_url && (
                  <div className="flex gap-2">
                    <button onClick={handleDownload} className="flex items-center gap-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition">
                      <Download size={14} /> Descargar
                    </button>
                    <a href={file.public_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-lg transition">
                      <ExternalLink size={14} /> Abrir
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar info */}
          <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-border p-5 flex flex-col gap-5 flex-shrink-0">
            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Descripción</span>
                {canEdit && !editingDesc && (
                  <button
                    onClick={() => setEditingDesc(true)}
                    className="text-muted-foreground hover:text-foreground transition"
                    aria-label="Editar descripción"
                  >
                    <Edit2 size={13} />
                  </button>
                )}
              </div>
              {editingDesc && canEdit ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    rows={3}
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    autoFocus
                    placeholder="Agregar descripción..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveDesc}
                      disabled={saving}
                      className="flex-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground py-1.5 rounded-lg transition disabled:opacity-60"
                    >
                      {saving ? "Guardando..." : "Guardar"}
                    </button>
                    <button
                      onClick={() => { setEditingDesc(false); setDesc(file.description || "") }}
                      className="text-xs border border-border px-3 py-1.5 rounded-lg hover:bg-muted transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground leading-relaxed">
                  {file.description || <span className="text-muted-foreground italic">Sin descripción</span>}
                </p>
              )}
            </div>

            {/* Tags */}
            {file.tags.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Tag size={12} className="text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Etiquetas</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {file.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Meta */}
            <div className="flex flex-col gap-2.5 text-sm">
              <div className="flex items-start gap-2 text-muted-foreground">
                <HardDrive size={14} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs uppercase tracking-wide font-semibold">Tamaño</p>
                  <p className="text-foreground">{formatSize(file.file_size)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-muted-foreground">
                <Calendar size={14} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs uppercase tracking-wide font-semibold">Fecha</p>
                  <p className="text-foreground">{formatDate(file.created_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
