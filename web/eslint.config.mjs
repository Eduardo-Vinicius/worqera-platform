import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: [".next/**", "node_modules/**", "out/**", "public/**", "next-env.d.ts"] },
  {
    rules: {
      // API payloads are loosely typed on purpose; typing them all is a separate job.
      "@typescript-eslint/no-explicit-any": "off",
      // React Compiler rules flag the usual fetch-in-effect pattern; kept visible as warnings.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
]

export default config
