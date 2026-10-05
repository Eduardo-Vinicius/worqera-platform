import { getRuntimeConfigV1, type PlatformNotice } from "@/lib/apiV1"

export type RuntimeSnapshot = {
  seal: string
  features: Record<string, boolean>
  services: Record<string, boolean>
  notices: PlatformNotice[]
}

let current: RuntimeSnapshot | null = null
let inflight: Promise<RuntimeSnapshot | null> | null = null

export function runtimeSnapshot() {
  return current
}

export function featureOn(key: string) {
  if (!current?.features || !(key in current.features)) return true
  return current.features[key] !== false
}

export function serviceOn(key: string) {
  if (!current?.services || !(key in current.services)) return true
  return current.services[key] !== false
}

export async function refreshRuntimeConfig() {
  if (typeof window === "undefined") return null
  if (!localStorage.getItem("token")) return null
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const data = await getRuntimeConfigV1({
        platform: "web",
        version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
      })
      current = {
        seal: data.seal || "",
        features: data.features || {},
        services: data.services || {},
        notices: data.notices || [],
      }
      window.dispatchEvent(new Event("wq-runtime-config"))
      return current
    } catch {
      return current
    } finally {
      inflight = null
    }
  })()
  return inflight
}
