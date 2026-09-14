import { createContext, useContext } from "react";
import type { ChartMode } from "../lib/palette";

/** Resolved light/dark mode, so charts can pick literal SVG colours. */
export const ThemeContext = createContext<ChartMode>("light");

export const useChartMode = (): ChartMode => useContext(ThemeContext);
