import type { EntryContext, RouteComponent } from "@remix-run/node";
import { Response } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import isbot from "isbot";
import { renderToPipeableStream, renderToString } from "react-dom/server";
import { PassThrough } from "stream";
import { Head } from "~/root";
import globalCss from "~/styles/global.css";

const ABORT_DELAY = 5000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  const callbackName = isbot(request.headers.get("user-agent"))
    ? "onAllReady"
    : "onShellReady";

  // create new context renders only <Head> and does not render errors
  let headContext = switchRootComponent(remixContext, Head);

  let head = renderToString(
    <RemixServer context={headContext} url={request.url} />
  );
  // for some reason 404 doesn't render <Head> so we need to add the global css
  if (!head) {
    head = `<link rel="stylesheet" href="${globalCss}" />`;
  }

  return new Promise((resolve, reject) => {
    let didError = false;

    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        [callbackName]: () => {
          const body = new PassThrough();

          responseHeaders.set("Content-Type", "text/html");

          resolve(
            new Response(body, {
              headers: responseHeaders,
              status: didError ? 500 : responseStatusCode,
            })
          );
          const html = `<!DOCTYPE html><html><head><!--start head-->${head}<!--end head--></head><body><div id="root">`;
          body.write(html);
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

export function switchRootComponent(
  remixContext: EntryContext,
  Head: RouteComponent
): EntryContext {
  let serverHandoffString = remixContext.serverHandoffString;
  if (serverHandoffString) {
    let serverHandoff = JSON.parse(serverHandoffString);
    // remove errors from JSON string
    delete serverHandoff?.state?.errors;
    serverHandoffString = JSON.stringify(serverHandoff);
  }

  return {
    ...remixContext,
    serverHandoffString,
    staticHandlerContext: {
      ...remixContext.staticHandlerContext,
      errors: null, // remove errors from context
    },
    routeModules: {
      ...remixContext.routeModules,
      root: {
        ...remixContext.routeModules.root,
        default: Head,
      },
    },
  };
}
