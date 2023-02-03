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
        <NavLink to="/not-found">Not Found</NavLink>
        <NavLink to="/error">Error Route</NavLink>
      </nav>
      <Outlet />
      <ScrollRestoration />
      <Scripts />
      <LiveReload />
    </>
  );
}

export function CatchBoundary() {
  return (
    <div>
      <h1>This is a catch boundary!</h1>
      <p>
        <a href="/">Go back home</a>
      </p>
    </div>
  );
}

export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <div>
      <h1>{error.message}</h1>
      <pre>{error.stack}</pre>
      <p>
        <a href="/">Go back home</a>
      </p>
    </div>
  );
}
