import { lazy } from "solid-js";

// Dev only. In a production build import.meta.env.DEV is false, so the viewer's code is
// never imported or bundled, and this page shows "Not found".
export default import.meta.env.DEV
  ? lazy(() => import("../../dev/PlantViewer"))
  : () => <p class="status">Not found</p>;
