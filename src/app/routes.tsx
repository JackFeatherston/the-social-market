import { createBrowserRouter } from "react-router";
import { SignUp } from "./screens/SignUp";
import { SignIn } from "./screens/SignIn";
import { Home } from "./screens/Home";
import { Friends } from "./screens/Friends";
import { BetDetail } from "./screens/BetDetail";
import { CreateBet } from "./screens/CreateBet";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: SignUp,
  },
  {
    path: "/signin",
    Component: SignIn,
  },
  {
    path: "/home",
    Component: Home,
  },
  {
    path: "/friends",
    Component: Friends,
  },
  {
    path: "/bet/:id",
    Component: BetDetail,
  },
  {
    path: "/create-bet",
    Component: CreateBet,
  },
]);
