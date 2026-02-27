"use client"

import {
  FileText, FileImage, FileSpreadsheet, File, Archive,
  Video, Music, FileCode, FileType,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type FileCategory =
  | "image" | "pdf" | "word" | "excel" | "powerpoint"
  | "text" | "zip" | "video" | "audio" | "other"

export function detectCategory(mimeType: string, fileName = ""): FileCategory {
  if (!mimeType) {
    const ext = fileName.split(".").pop()?.toLowerCase() ?? ""
    if (ext === "pdf") return "pdf"
    if (["jpg","jpeg","png","gif","webp","svg","bmp"].includes(ext)) return "image"
    if (["xls","xlsx","csv"].includes(ext)) return "excel"
    if (["doc","docx","odt","rtf"].includes(ext)) return "word"
    if (["ppt","pptx"].includes(ext)) return "powerpoint"
    if (["txt","md"].includes(ext)) return "text"
    if (["mp4","mov","avi","mkv","webm"].includes(ext)) return "video"
    if (["mp3","wav","ogg","flac"].includes(ext)) return "audio"
    if (["zip","rar","7z","tar","gz"].includes(ext)) return "zip"
    if (["js","ts","tsx","jsx","py","html","css","json"].includes(ext)) return "text"
    return "other"
  }
  if (mimeType === "application/pdf") return "pdf"
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType === "text/csv") return "excel"
  if (mimeType.includes("word") || mimeType.includes("opendocument.text")) return "word"
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "powerpoint"
  if (mimeType === "text/plain" || mimeType.includes("javascript") || mimeType.includes("json") || mimeType.includes("html")) return "text"
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar")) return "zip"
  return "other"
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    year: "numeric", month: "short", day: "numeric",
  })
}

const iconMap: Record<FileCategory, React.ElementType> = {
  image: FileImage,
  pdf: FileType,
  word: FileText,
  excel: FileSpreadsheet,
  powerpoint: FileText,
  text: FileCode,
  zip: Archive,
  video: Video,
  audio: Music,
  other: File,
}

const colorMap: Record<FileCategory, string> = {
  image:      "text-emerald-500 bg-emerald-500/10",
  pdf:        "text-red-500 bg-red-500/10",
  word:       "text-blue-500 bg-blue-500/10",
  excel:      "text-green-600 bg-green-600/10",
  powerpoint: "text-orange-500 bg-orange-500/10",
  text:       "text-slate-500 bg-slate-500/10",
  zip:        "text-yellow-600 bg-yellow-600/10",
  video:      "text-purple-500 bg-purple-500/10",
  audio:      "text-pink-500 bg-pink-500/10",
  other:      "text-muted-foreground bg-muted",
}

const sizeMap = {
  sm: { wrap: "w-8 h-8 rounded",    icon: 16 },
  md: { wrap: "w-10 h-10 rounded-md", icon: 20 },
  lg: { wrap: "w-14 h-14 rounded-lg", icon: 28 },
  xl: { wrap: "w-20 h-20 rounded-xl", icon: 40 },
}

interface FileIconProps {
  category: FileCategory
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

export default function FileIcon({ category, size = "md", className }: FileIconProps) {
  const Icon = iconMap[category] ?? File
  const color = colorMap[category] ?? colorMap.other
  const { wrap, icon } = sizeMap[size]
  return (
    <div className={cn("flex items-center justify-center flex-shrink-0", wrap, color, className)}>
      <Icon size={icon} />
    </div>
  )
}
