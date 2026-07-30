"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
} | null>(null);

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (count, error) =>
              !(error instanceof Error && error.message === "authentication_required") &&
              count < 1
          }
        }
      })
  );
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem("reponest.theme");
    const next =
      stored === "dark" ||
      (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)
        ? "dark"
        : "light";
    // Theme preference is an external browser setting restored after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }, []);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () =>
        setTheme((current) => {
          const next = current === "light" ? "dark" : "light";
          document.documentElement.dataset.theme = next;
          localStorage.setItem("reponest.theme", next);
          return next;
        })
    }),
    [theme]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    </QueryClientProvider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside Providers.");
  return value;
}
