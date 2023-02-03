export function meta() {
  return {
    title: "Home Page",
    description: "This is the Home Page!",
  };
}

export function loader() {
  throw new Error("Oops!");
}

export default function Index() {
  return (
    <main>
      <h1>Error Page</h1>
    </main>
  );
}
