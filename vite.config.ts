import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const adProvider = env.VITE_ENABLE_CG_ADS === "true" ? "AdProvider.full.ts" : "AdProvider.basic.ts";

  return {
    base: "./",
    resolve: {
      alias: {
        "#ad-provider": fileURLToPath(new URL(`./src/monetization/${adProvider}`, import.meta.url))
      }
    },
    build: {
      target: "es2020",
      sourcemap: false,
      assetsInlineLimit: 4096,
      chunkSizeWarningLimit: 1024
    },
    server: {
      host: "0.0.0.0"
    },
    preview: {
      host: "0.0.0.0"
    }
  };
});
