export type Role = "admin" | "user"

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  created_at: string
}

export interface FileRecord {
  id: string
  name: string
  description: string
  tags: string[]
  file_path: string
  file_type: string
  file_size: number
  uploaded_by: string | null
  created_at: string
  updated_at: string
  public_url?: string
}
