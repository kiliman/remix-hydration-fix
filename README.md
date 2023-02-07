# Remix Hydration Fix

## 📦 TL;DR

[@Xiphe](https://github.com/Xiphe) has wrapped this up in a nice package [remix-island](https://github.com/Xiphe/remix-island). Definitely check it out!

## 👀 View Sample App

I have a running sample at https://remix-hydration-fix-production.up.railway.app

## 😱 WTH (What The Hydration⁉️)

One of the main selling points of Remix is that you own the entire HTML document.
This is both a blessing and a curse. On one hand, you have complete control of
your rendered document.

<a href="https://www.loom.com/share/911412524f5e42618f64bc6c8ec5bf35">
<img style="max-width:300px;" src="https://cdn.loom.com/sessions/thumbnails/911412524f5e42618f64bc6c8ec5bf35-with-play.gif">
</a>

## 🤦‍♂️ Hydration Fail

However, _The Internet_ doesn't care about your app. Many users typically have
browser extensions that inject scripts, styles, or random elements into the DOM.
When Remix tries to hydrate the client, there is a mismatch between what was
server-rendered and what was rendered on the client.

A big problem with how React 18 works is that if client hydration fails, it will
throw away your nicely rendered HTML and start over client rendering. This will
cause things like `defer` (streaming) to fail.

## 💡 Solution

Frameworks before Remix worked around this by hydrating a `<div>` inside the
`<body>`, so extensions typically wouldn't affect your app.

So to work around this hydration issue, we split up your _app_ into two parts.
The `<Head>` part and the rest of your app (that will be rendered in a `<div id="root"/>`).

## root.tsx

The initial template had _root.tsx_ route export a `default` function that rendered everything,
from `<html>` to `<head>` to `<body>`. Since this is what is causing hydration errors,
we need to split that up into two parts. The `<Head>` component is what is rendered
_inside_ the `<head>` element. Do **not** include the `<head>` element, as that will be rendered
automatically from _entry.server.tsx_.

The `default` export will be rendered inside `<body><div id="root"/></body>`. Again,
this is to work around hydration issues. Nothing should directly modify the contents
of the root `div`.

You'll notice that the `default` export also renders the `<Head>` component. This is so
changes to `meta` and `links` will be updated as the user navigates. We need this
`<Head>` to be rendered in the same context as your app. The previous `<Head>` was
rendered as plain text, so React isn't hooked up to it.

When rendering the `<Head>` there are two things to deal with.

1. The `<Head>` component needs to be rendered where the actual `<head>` is, not the
   root `div`. So we use a React portal here, to tell React where to render.
2. We need to wait until hydration is completed before we re-render the `<Head>`,
   otherwise it will defeat the purpose of our hydration fix and we'll get the
   errors again. So we wrap that in `<ClientOnly>` from [remix-utils](https://github.com/sergiodxa/remix-utils#clientonly)

```ts
// root.tsx
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
      <Outlet />
      <ScrollRestoration />
      <Scripts />
      <LiveReload />
    </>
  );
}
```

## entry.server.tsx

When server rendering, we want to send the `<head>` as static HTML, not
part of the app render. We need to render the `<Head>` export as string, then stream
the rest of the app to the client.

Notice how we wrap the contents in `<!--start head--><!--end head-->` comments. This
will be needed during hydration.

`<RemixServer>` wants to render the `default` export of _root.tsx_. So we _trick_
Remix by swapping out the default with `Head`. Render that as string and write it
to the stream (including the `<html>` tag).

Finally we switch back the default and render the app to the stream.

```ts
// entry.server.tsx
function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  // swap out default component with <Head>
  const defaultRoot = remixContext.routeModules.root;
  remixContext.routeModules.root = {
    ...defaultRoot,
    default: Head,
  };

  let head = renderToString(
    <RemixServer context={remixContext} url={request.url} />
  );

  // restore the default root component
  remixContext.routeModules.root = defaultRoot;

  return new Promise((resolve, reject) => {
    let didError = false;

    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        onShellReady() {
          const body = new PassThrough();

          responseHeaders.set("Content-Type", "text/html");

          resolve(
            new Response(body, {
              headers: responseHeaders,
              status: didError ? 500 : responseStatusCode,
            })
          );

          body.write(
            `<!DOCTYPE html><html><head><!--start head-->${head}<!--end head--></head><body><div id="root">`
          );
          pipe(body);
          body.write(`</div></body></html>`);
        },
        onShellError(err: unknown) {
          reject(err);
        },
        onError(error: unknown) {
          didError = true;

          console.error(error);
        },
      }
    );

    setTimeout(abort, ABORT_DELAY);
  });
}
```

## entry.client.tsx

Once the HTML has been rendered and the browser is ready, we want to hydrate our
app on the client. At this point, we have a `<head>` that is not part of the Remix
context, and we are rendering the `default` export into our root `div`.

Since `<Head>` is wrapped in `<ClientOnly>`, it will not re-render until **after**
hydration. At this point, we want to remove the server rendered `<Head>`. Otherwise
we'll end up with duplicates, since React won't replace the existing content. That
is why the HTML comments are there. They're just placeholders so we can remove the previously rendered `<Head>`.

Once the client is hydrated and the static `<Head>` is removed, the `<ClientOnly>`
component will re-render and the new `<Head>` will render in the React portal under
the correct Remix context.

And there you go. No more hydration errors 🥳.

```ts
function hydrate() {
  startTransition(() => {
    // @ts-expect-error
    hydrateRoot(document.getElementById("root"), <RemixApp />);
    // since <Head> is wrapped in <ClientOnly> it will
    // not render until after hydration
    // so we need to remove the server rendered head
    // in preparation for the client side render
    document.head.innerHTML = document.head.innerHTML.replace(
      /<!--start head-->.+<!--end head-->/,
      ""
    );
  });
}

function RemixApp() {
  return (
    <StrictMode>
      <RemixBrowser />
    </StrictMode>
  );
}

if (typeof requestIdleCallback === "function") {
  requestIdleCallback(hydrate);
} else {
  // Safari doesn't support requestIdleCallback
  // https://caniuse.com/requestidlecallback
  setTimeout(hydrate, 1);
}
```
