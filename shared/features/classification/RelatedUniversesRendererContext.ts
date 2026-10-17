import { createContext, type ReactNode } from "react";
import type { UniverseId } from "../universes/universe-rules";

// Layouts supply presentation without shared labels importing layout modules.
export const RelatedUniversesRendererContext = createContext<
  ((related: UniverseId[]) => ReactNode) | null
>(null);
