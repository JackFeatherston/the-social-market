import { createBrowserRouter } from "react-router";
import { SignUp } from "./screens/SignUp";
import { SignIn } from "./screens/SignIn";
import { Home } from "./screens/Home";
import { Friends } from "./screens/Friends";
import { Profile } from "./screens/Profile";
import { BetDetail } from "./screens/BetDetail";
import { Bets } from "./screens/Bets";
import { CreateBet } from "./screens/CreateBet";
import { PlaceBet } from "./screens/PlaceBet";
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
  {
    path: "/place-bet",
    element: (
      <ProtectedRoute>
        <PlaceBet />
      </ProtectedRoute>
    ),
  },
  {
    path: "/bets",
    element: (
      <ProtectedRoute>
        <Bets />
      </ProtectedRoute>
    ),
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    ),
  },
]);
