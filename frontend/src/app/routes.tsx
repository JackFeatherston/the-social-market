import { createBrowserRouter } from "react-router";
import { SignUp } from "./screens/SignUp";
import { SignIn } from "./screens/SignIn";
import { Home } from "./screens/Home";
import { Friends } from "./screens/Friends";
import { BetDetail } from "./screens/BetDetail";
import { CreateBet } from "./screens/CreateBet";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: SignIn,
  },
  {
    path: "/signup",
    Component: SignUp,
  },
  {
    path: "/home",
    element: (
      <ProtectedRoute>
        <Home />
      </ProtectedRoute>
    ),
  },
  {
    path: "/friends",
    element: (
      <ProtectedRoute>
        <Friends />
      </ProtectedRoute>
    ),
  },
  {
    path: "/bet/:id",
    element: (
      <ProtectedRoute>
        <BetDetail />
      </ProtectedRoute>
    ),
  },
  {
    path: "/create-bet",
    element: (
      <ProtectedRoute>
        <CreateBet />
      </ProtectedRoute>
    ),
  },
]);
