import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // A module in another folder is imported through the @/ alias, so an import reads the same from every file. The
  // world's engine and the Node scripts are plain JavaScript run outside the bundler, and keep relative paths.
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ regex: "^\\.\\./", message: "Import from another folder through @/." }] },
      ],
    },
  },
]);

export default eslintConfig;
