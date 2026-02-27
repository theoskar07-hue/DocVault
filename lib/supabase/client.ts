import { createBrowserClient } from "@supabase/ssr"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://oiwnpqwlttzowotrvddq.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pd25wcXdsdHR6b3dvdHJ2ZGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDYwOTEsImV4cCI6MjA4Nzc4MjA5MX0.1EZqXnv8HHZwaG9AQeFfFwnp7JUVQ_JQeHZgSvASVfs"

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!client) {
    client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return client
}
