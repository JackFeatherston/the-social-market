import { useState } from "react";
import { RouterProvider } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { router } from "./routes";
import { AuthProvider } from "./context/AuthContext";
import { BetMenuContext } from "./context/BetMenuContext";

export default function App() {
  const [showBetMenu, setShowBetMenu] = useState(false);

  function openBetMenu() { setShowBetMenu(true); }
  function close() { setShowBetMenu(false); }
  function go(path: string) { close(); router.navigate(path); }

  return (
    <AuthProvider>
      <BetMenuContext.Provider value={openBetMenu}>
        <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
          <div className="relative w-full max-w-[390px] h-[844px] bg-background rounded-[3rem] overflow-hidden shadow-2xl border-8 border-[#1a1a1a] flex flex-col">
            <RouterProvider router={router} />

            <AnimatePresence>
              {showBetMenu && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-black/60 z-50 flex items-end"
                  onClick={close}
                >
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    className="w-full bg-card rounded-t-3xl p-5 space-y-3 border-t border-x border-border pb-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />

                    <button
                      onClick={() => go("/create-bet")}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-background border border-border hover:border-primary/50 transition-colors text-left"
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-foreground font-semibold">Create a New Bet</p>
                        <p className="text-muted-foreground text-sm">Start a prediction market with your friends</p>
                      </div>
                    </button>

                    <button
                      onClick={() => go("/place-bet")}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-background border border-border hover:border-primary/50 transition-colors text-left"
                    >
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-foreground font-semibold">Place Bet on Existing</p>
                        <p className="text-muted-foreground text-sm">Join an active bet from a friend or group</p>
                      </div>
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </BetMenuContext.Provider>
    </AuthProvider>
  );
}
