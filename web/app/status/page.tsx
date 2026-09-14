import { redirect } from "next/navigation"

/** Kanban legado → board por setores (Mongo /api/v1) */
export default function StatusRedirectPage() {
  redirect("/kanban")
}
