import type { MetaFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { createPortal } from "react-dom";
import { ClientOnly } from "remix-utils";
import css from "~/styles/global.css";

export function links() {
  return [{ rel: "stylesheet", href: css }];
}

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  viewport: "width=device-width,initial-scale=1",
});

export function Head() {
  return (
    <>
      <Meta />
      <Links />
    </>
  );
}

export default function App() {
  return (
    <>
      <ClientOnly>{() => createPortal(<Head />, document.head)}</ClientOnly>
      <nav>
        <NavLink to="/">Home</NavLink>
        <NavLink to="/test">Test</NavLink>
        <NavLink to="/defer">Defer</NavLink>
      </nav>
      <Outlet />
      <ScrollRestoration />
      <Scripts />
      <LiveReload />
    </>
  );
}
