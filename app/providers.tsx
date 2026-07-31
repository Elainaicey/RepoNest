"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toast } from "radix-ui";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
} | null>(null);

type Notice = { id: number; title: string; description?: string };
const ToastContext = createContext<{
  notify: (title: string, description?: string) => void;
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
  const [notices, setNotices] = useState<Notice[]>([]);
  const notify = useCallback((title: string, description?: string) => {
    setNotices((current) => [
      ...current.slice(-2),
      { id: Date.now() + Math.random(), title, description }
    ]);
  }, []);

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
      <ThemeContext.Provider value={value}>
        <ToastContext.Provider value={{ notify }}>
          <Toast.Provider duration={3600} swipeDirection="right">
            {children}
            {notices.map((notice) => (
              <Toast.Root
                className="toast-root"
                key={notice.id}
                onOpenChange={(open) => {
                  if (!open) {
                    setNotices((current) => current.filter((item) => item.id !== notice.id));
                  }
                }}
              >
                <Toast.Title className="toast-title">{notice.title}</Toast.Title>
                {notice.description && (
                  <Toast.Description className="toast-description">
                    {notice.description}
                  </Toast.Description>
                )}
              </Toast.Root>
            ))}
            <Toast.Viewport className="toast-viewport" />
          </Toast.Provider>
        </ToastContext.Provider>
      </ThemeContext.Provider>
    </QueryClientProvider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside Providers.");
  return value;
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside Providers.");
  return value;
}
