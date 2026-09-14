import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { CategoriesPage } from "./pages/CategoriesPage";
import { Dashboard } from "./pages/Dashboard";
import { Landing } from "./pages/Landing";
import { NotFound } from "./pages/NotFound";
import { PromptsPage } from "./pages/PromptsPage";
import { UsageLogsPage } from "./pages/UsageLogsPage";
import { UsersPage } from "./pages/UsersPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* The landing page sits outside the app shell so it gets the full width. */}
        <Route index element={<Landing />} />

        <Route element={<AppShell />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="usage" element={<UsageLogsPage />} />
          <Route path="prompts" element={<PromptsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
