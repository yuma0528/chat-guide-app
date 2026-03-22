import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";
import ja from "@shopify/polaris/locales/ja.json";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "./lib/trpc";
import HomePage from "./pages/HomePage";
import ScenarioListPage from "./pages/ScenarioListPage";
import ScenarioEditorPage from "./pages/ScenarioEditorPage";
import SettingsPage from "./pages/WidgetSettingsPage";

function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: import.meta.env.VITE_FUNCTIONS_URL + "/api/trpc",
          async headers() {
            // App Bridgeからsession tokenを取得
            const token = await shopify.idToken();
            return {
              Authorization: `Bearer ${token}`,
            };
          },
        }),
      ],
    })
  );

  // 初回マウント時にtoken exchangeを実行
  useEffect(() => {
    async function ensureTokenExchange() {
      try {
        const token = await shopify.idToken();
        await fetch(
          import.meta.env.VITE_FUNCTIONS_URL + "/api/auth/token-exchange",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
      } catch (error) {
        console.error("Token exchange failed:", error);
      }
    }
    ensureTokenExchange();
  }, []);

  return (
    <AppProvider i18n={ja}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ui-nav-menu>
              <a href="/" rel="home">ホーム</a>
              <a href="/scenarios">シナリオ一覧</a>
              <a href="/settings">設定</a>
            </ui-nav-menu>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/scenarios" element={<ScenarioListPage />} />
              <Route
                path="/scenarios/:id"
                element={<ScenarioEditorPage />}
              />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </BrowserRouter>
        </QueryClientProvider>
      </trpc.Provider>
    </AppProvider>
  );
}

export default App;
