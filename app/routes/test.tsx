import css from "~/styles/test.css";

export function links() {
  return [{ rel: "stylesheet", href: css }];
}

export function meta() {
  return {
    title: "Test page",
    description: "Remix Test Page!",
  };
}

export default function Test() {
  return (
    <main>
      <h1>Test Page</h1>
    </main>
  );
}
