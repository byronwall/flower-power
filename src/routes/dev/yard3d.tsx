import { useSearchParams } from "@solidjs/router";
import { createSignal } from "solid-js";
import { sample } from "../../account/sample";
import { YardView3D } from "../../components/YardView3D";
import type { ViewTime } from "../../render/look";
import type { Pick } from "../../render/yard3d";

// Dev check for the 3D yard: the sample lot full screen, with the month and year in the URL
// (?month=6&year=3) so the same view can be captured again after a change.
export default function Yard3DCheck() {
  const [params] = useSearchParams<{ month?: string; year?: string }>();
  const time = (): ViewTime => ({ month: Number(params.month) || 6, year: Number(params.year) || 3 });
  const [selected, setSelected] = createSignal<Pick | null>(null);
  return (
    <div style={{ position: "fixed", inset: "0", display: "flex" }}>
      <YardView3D property={sample} time={time()} selected={selected()} onPick={setSelected} onDropPlant={() => {}} />
    </div>
  );
}
