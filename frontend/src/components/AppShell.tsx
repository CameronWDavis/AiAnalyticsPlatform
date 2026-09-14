import { Link, NavLink, Outlet } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import type { ThemePreference } from "../hooks/useTheme";
import { ThemeContext } from "../hooks/themeContext";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", end: true, icon: "M3 13h4v6H3zM10 5h4v14h-4zM17 9h4v10h-4z" },
  { to: "/usage", label: "Usage logs", end: false, icon: "M4 19h16M4 5v14M8 15l4-6 4 3 4-7" },
  { to: "/prompts", label: "Prompts", end: false, icon: "M4 5h16v11H9l-5 4z" },
  { to: "/users", label: "Users", end: false, icon: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0" },
  { to: "/categories", label: "Categories", end: false, icon: "M4 6h16M4 12h16M4 18h10" },
] as const;

const THEME_OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Auto" },
];

export function AppShell() {
  const theme = useTheme();

  return (
    <ThemeContext.Provider value={theme.mode}>
      <div className="brand-stripe" aria-hidden="true" />
      <div className="shell">
        <aside className="sidebar">
          <Link className="brand" to="/" aria-label="Back to the home page">
            <span className="brand__mark" aria-hidden="true">
              AI
            </span>
            <div>
              <div className="brand__name">Analytics</div>
              <div className="brand__sub">Prompt &amp; token usage</div>
            </div>
          </Link>

          <nav className="nav" aria-label="Main">
            <span className="nav__label">Explore</span>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav__item${isActive ? " nav__item--active" : ""}`}
              >
                <svg
                  className="nav__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={item.icon} />
                </svg>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="sidebar__footer">
            <div className="segmented" role="group" aria-label="Colour theme">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="segmented__option"
                  aria-pressed={theme.preference === option.value}
                  onClick={() => theme.setPreference(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="main">
          <Outlet />
        </main>
      </div>
    </ThemeContext.Provider>
  );
}
