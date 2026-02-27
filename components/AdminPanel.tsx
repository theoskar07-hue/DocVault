"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Upload, Users, Trash2, Edit2, Check, X, UserPlus,
  Shield, User as UserIcon, ChevronRight, RefreshCw,
} from "lucide-react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { Profile, FileRecord } from "@/lib/types"
import FileIcon, { detectCategory, formatDate, formatSize } from "./FileIcon"
import type { FileCategory } from "./FileIcon"

interface AdminPanelProps {
  files: FileRecord[]
  currentUser: User
  onFilesChange: (files: FileRecord[]) => void
}

type Tab = "upload" | "users"

export default function AdminPanel({ files, currentUser, onFilesChange }: AdminPanelProps) {
  const [tab, setTab] = useState<Tab>("upload")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex border-b border-border">
        <TabBtn active={tab === "upload"} onClick={() => setTab("upload")} icon={<Upload size={15} />}>
          Subir archivos
        </TabBtn>
        <TabBtn active={tab === "users"} onClick={() => setTab("users")} icon={<Users size={15} />}>
          Usuarios
        </TabBtn>
      </div>

      {tab === "upload" && <UploadTab files={files} currentUser={currentUser} onFilesChange={onFilesChange} />}
      {tab === "users" && <UsersTab />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TabBtn
// ─────────────────────────────────────────────────────────────────────────────

function TabBtn({ active, onClick, icon, children }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition ${
        active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload Tab
// ─────────────────────────────────────────────────────────────────────────────

interface UploadTabProps {
  files: FileRecord[]
  currentUser: User
  onFilesChange: (files: FileRecord[]) => void
}

interface PendingFile {
  id: string
  file: File
  description: string
  tags: string
  preview?: string
}

function UploadTab({ files, currentUser, onFilesChange }: UploadTabProps) {
  const [dragging, setDragging] = useState(false)
  const [pending, setPending] = useState<PendingFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function addFiles(fileList: FileList | null) {
    if (!fileList) return
    const news: PendingFile[] = Array.from(fileList).map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      description: "",
      tags: "",
      preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
    }))
    setPending((p) => [...p, ...news])
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }, [])

  async function handleUpload() {
    if (pending.length === 0) return
    setUploading(true)
    setError("")
    const supabase = createClient()
    try {
      for (const p of pending) {
        const ext = p.file.name.split(".").pop()
        const path = `${currentUser.id}/${Date.now()}_${crypto.randomUUID()}.${ext}`

        // 1. Upload to Storage
        const { error: storageErr } = await supabase.storage
          .from("documents")
          .upload(path, p.file, { contentType: p.file.type, upsert: false })
        if (storageErr) throw storageErr

        // 2. Insert metadata into DB
        const { error: dbErr } = await supabase.from("files").insert({
          name: p.file.name,
          description: p.description || null,
          tags: p.tags.split(",").map((t) => t.trim()).filter(Boolean),
          file_path: path,
          file_type: detectCategory(p.file.type, p.file.name),
          file_size: p.file.size,
          uploaded_by: currentUser.id,
        })
        if (dbErr) throw dbErr
      }

      // Refresh file list
      const { data } = await supabase.from("files").select("*").order("created_at", { ascending: false })
      onFilesChange((data as FileRecord[]) ?? [])
      setSuccess(`${pending.length} archivo(s) subido(s) correctamente`)
      setPending([])
      setTimeout(() => setSuccess(""), 5000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al subir archivos")
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(file: FileRecord) {
    setDeletingId(file.id)
    const supabase = createClient()
    try {
      await supabase.storage.from("documents").remove([file.file_path])
      await supabase.from("files").delete().eq("id", file.id)
      onFilesChange(files.filter((f) => f.id !== file.id))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al eliminar")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 text-center transition-colors cursor-pointer ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40"
        }`}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${dragging ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          <Upload size={24} />
        </div>
        <div>
          <p className="font-medium text-foreground">Arrastra archivos aquí o haz clic para seleccionar</p>
          <p className="text-sm text-muted-foreground mt-1">PDF, imágenes, Word, Excel, ZIP y más</p>
        </div>
        <input id="file-input" type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
      </div>

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
          <Check size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Pending list */}
      {pending.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">{pending.length} archivo(s) por subir</h3>
            <div className="flex gap-2">
              <button onClick={() => setPending([])} className="text-sm text-muted-foreground hover:text-foreground transition">
                Limpiar
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex items-center gap-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition disabled:opacity-60"
              >
                <Upload size={14} />
                {uploading ? "Subiendo..." : "Subir todos"}
              </button>
            </div>
          </div>

          {pending.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex gap-4 items-start">
              {p.preview ? (
                <img src={p.preview} alt={p.file.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <FileIcon category={detectCategory(p.file.type, p.file.name)} size="lg" />
              )}
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{p.file.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(p.file.size)}</p>
                <input
                  type="text"
                  placeholder="Descripción del archivo..."
                  value={p.description}
                  onChange={(e) => setPending((prev) => prev.map((x) => x.id === p.id ? { ...x, description: e.target.value } : x))}
                  className="w-full text-sm bg-background border border-input rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="text"
                  placeholder="Etiquetas separadas por coma..."
                  value={p.tags}
                  onChange={(e) => setPending((prev) => prev.map((x) => x.id === p.id ? { ...x, tags: e.target.value } : x))}
                  className="w-full text-sm bg-background border border-input rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                onClick={() => setPending((prev) => prev.filter((x) => x.id !== p.id))}
                className="text-muted-foreground hover:text-destructive transition p-1 flex-shrink-0"
                aria-label="Quitar archivo"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded files list */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">Archivos subidos ({files.length})</h3>
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay archivos.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {files.map((f) => (
              <div key={f.id} className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3">
                <FileIcon category={f.file_type as FileCategory} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(f.file_size)} · {formatDate(f.created_at)}</p>
                </div>
                <button
                  onClick={() => handleDelete(f)}
                  disabled={deletingId === f.id}
                  className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition disabled:opacity-50"
                  aria-label="Eliminar"
                >
                  {deletingId === f.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Users Tab  (uses public.profiles table — no admin SDK needed)
// ─────────────────────────────────────────────────────────────────────────────

function UsersTab() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editProfile, setEditProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "user" as Profile["role"] })
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  async function loadProfiles() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })
    setProfiles((data as Profile[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadProfiles() }, [])

  function openCreate() {
    setEditProfile(null)
    setForm({ email: "", password: "", full_name: "", role: "user" })
    setError("")
    setShowForm(true)
  }

  function openEdit(p: Profile) {
    setEditProfile(p)
    setForm({ email: "", password: "", full_name: p.full_name, role: p.role })
    setError("")
    setShowForm(true)
  }

  async function handleSave() {
    setError("")
    setSaving(true)
    const supabase = createClient()
    try {
      if (editProfile) {
        // Update role and full_name in profiles table
        const { error: upErr } = await supabase
          .from("profiles")
          .update({ full_name: form.full_name, role: form.role })
          .eq("id", editProfile.id)
        if (upErr) throw upErr
      } else {
        // Create new user via Supabase Auth signUp
        if (!form.email.trim() || !form.password.trim() || !form.full_name.trim()) {
          setError("Todos los campos son requeridos")
          setSaving(false)
          return
        }
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: { full_name: form.full_name.trim(), role: form.role },
            emailRedirectTo: window.location.origin + "/DocVault/",
          },
        })
        if (signUpErr) throw signUpErr
        if (!data.user) throw new Error("No se pudo crear el usuario")
      }
      await loadProfiles()
      setShowForm(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const roleLabel: Record<Profile["role"], string> = {
    admin: "Administrador",
    user: "Usuario",
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Usuarios ({profiles.length})</h3>
        <div className="flex gap-2">
          <button onClick={loadProfiles} className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition" aria-label="Refrescar">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition"
          >
            <UserPlus size={14} /> Nuevo usuario
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <RefreshCw size={20} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {profiles.map((p) => (
            <div key={p.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                p.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                {p.role === "admin" ? <Shield size={16} /> : <UserIcon size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground">{p.full_name || p.email}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    p.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {roleLabel[p.role]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(p.created_at)}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition" aria-label="Editar">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => setConfirmDelete(p.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition" aria-label="Eliminar">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-foreground">{editProfile ? "Editar usuario" : "Nuevo usuario"}</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition"><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <FormField label="Nombre completo">
                <input type="text" value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Juan García" />
              </FormField>
              {!editProfile && (
                <>
                  <FormField label="Correo electrónico">
                    <input type="email" value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="usuario@empresa.com" />
                  </FormField>
                  <FormField label="Contraseña">
                    <input type="password" value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="••••••••" />
                  </FormField>
                </>
              )}
              <FormField label="Rol">
                <select value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Profile["role"] }))}
                  className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="user">Usuario (solo lectura)</option>
                  <option value="admin">Administrador (acceso total)</option>
                </select>
              </FormField>

              {!editProfile && (
                <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                  El usuario recibirá un correo de confirmación antes de poder iniciar sesión.
                </p>
              )}

              {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}

              <div className="flex gap-3 mt-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium py-2 rounded-lg transition disabled:opacity-60 flex items-center justify-center gap-2">
                  <Check size={14} />
                  {saving ? "Guardando..." : editProfile ? "Guardar cambios" : "Crear usuario"}
                </button>
                <button onClick={() => setShowForm(false)} className="border border-border text-sm font-medium px-4 py-2 rounded-lg hover:bg-muted transition">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-foreground mb-2">Eliminar usuario</h3>
            <p className="text-sm text-muted-foreground mb-5">Se eliminará el perfil del usuario. El administrador deberá borrar la cuenta desde el panel de Supabase.</p>
            <div className="flex gap-3">
              <button onClick={async () => {
                const supabase = createClient()
                await supabase.from("profiles").delete().eq("id", confirmDelete)
                setProfiles((p) => p.filter((x) => x.id !== confirmDelete))
                setConfirmDelete(null)
              }} className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm font-medium py-2 rounded-lg transition">
                Eliminar perfil
              </button>
              <button onClick={() => setConfirmDelete(null)} className="flex-1 border border-border text-sm font-medium py-2 rounded-lg hover:bg-muted transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}
