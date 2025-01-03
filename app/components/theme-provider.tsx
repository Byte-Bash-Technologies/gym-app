import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  attribute?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  attribute = "class",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Get initial theme from localStorage if available
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as Theme) || defaultTheme
    }
    return defaultTheme
  })

  useEffect(() => {
    const root = window.document.documentElement
    const body = window.document.body

    const prevTheme = theme === "system" ? getSystemTheme() : theme
    root.classList.remove("light", "dark")
    body.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = getSystemTheme()
      root.classList.add(systemTheme)
      body.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
      body.classList.add(theme)
    }
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem("theme", theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

