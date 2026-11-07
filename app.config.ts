import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
  ssr: false,
  // Lets a cloudflared quick tunnel reach the dev server for remote user tests.
  vite: { server: { allowedHosts: [".trycloudflare.com"] } },
});
