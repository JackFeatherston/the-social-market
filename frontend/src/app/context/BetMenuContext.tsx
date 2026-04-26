import { createContext, useContext } from "react";

export const BetMenuContext = createContext<() => void>(() => {});
export const useBetMenu = () => useContext(BetMenuContext);
