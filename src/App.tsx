import { useEffect, useState } from "react";
import ViewPage from "./pages/ViewPage";
import AdminPage from "./pages/AdminPage";

function currentRoute(): "admin" | "view" {
  return window.location.hash === "#/admin" ? "admin" : "view";
}

export default function App() {
  const [route, setRoute] = useState<"admin" | "view">(currentRoute);

  useEffect(() => {
    const onHashChange = () => setRoute(currentRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <span aria-hidden="true">&#128205;</span> AirTag Travel Map
        </h1>
        <nav>
          <a href="#/" className={route === "view" ? "active" : ""}>
            Map
          </a>
          <a href="#/admin" className={route === "admin" ? "active" : ""}>
            Edit data
          </a>
        </nav>
      </header>
      {route === "admin" ? <AdminPage /> : <ViewPage />}
    </div>
  );
}
