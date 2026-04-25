import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
        <div className="w-full max-w-[390px] h-[844px] bg-background rounded-[3rem] overflow-hidden shadow-2xl border-8 border-[#1a1a1a]">
          <RouterProvider router={router} />
        </div>
      </div>
    </AuthProvider>
  );
}