import { A } from "@solidjs/router";
import { Mascot } from "../components/Mascot";

// The app bar brand: Sprout plus the wordmark. The wordmark links home; a click on Sprout makes it hop.
export default function Brand() {
  return (
    <span class="brand">
      <Mascot size={44} plantId="purple-coneflower" class="brand-mascot" />
      <A href="/" class="wordmark brand-home">
        Flower Power
      </A>
    </span>
  );
}
