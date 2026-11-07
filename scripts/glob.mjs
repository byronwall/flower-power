import { register } from "node:module";

// Use with `pnpm tsx --import ./scripts/glob.mjs <script>`.
register("./glob-hooks.mjs", import.meta.url);
