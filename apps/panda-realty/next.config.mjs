import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function aliasTarget(...segments) {
  return path.join(__dirname, ...segments).replace(/\\/g, "/")
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["jspdf", "jspdf-autotable"],
  transpilePackages: ["@repo/ui", "@repo/admin", "@repo/auth-redirect"],
  experimental: {
    optimizePackageImports: ["lucide-react", "radix-ui"],
    serverActionsBodySizeLimit: "25mb",
  },
  turbopack: {
    resolveAlias: {
      "@admin-context": aliasTarget("lib/admin/admin-context.ts"),
      "@admin-client-context": aliasTarget("lib/admin/admin-client-context.ts"),
    },
  },
  webpack: (config) => {
    config.resolve.alias["@admin-context"] = aliasTarget(
      "lib/admin/admin-context.ts",
    )
    config.resolve.alias["@admin-client-context"] = aliasTarget(
      "lib/admin/admin-client-context.ts",
    )
    return config
  },
}

export default nextConfig
