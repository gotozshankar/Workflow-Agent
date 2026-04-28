import {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from "react"

interface AppSettings {
	appName: string
	appLogo: string | null // Base64 or URL
}

interface AppContextType {
	appSettings: AppSettings
	updateAppSettings: (settings: Partial<AppSettings>) => void
	resetAppSettings: () => void
}

const DEFAULT_SETTINGS: AppSettings = {
	appName: "AgentFlow",
	appLogo: null,
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
	const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
	const [mounted, setMounted] = useState(false)

	// Load settings from localStorage on mount
	useEffect(() => {
		const saved = localStorage.getItem("app-settings")
		if (saved) {
			try {
				setAppSettings(JSON.parse(saved))
			} catch {
				setAppSettings(DEFAULT_SETTINGS)
			}
		}
		setMounted(true)
	}, [])

	// Update document title whenever app name changes
	useEffect(() => {
		if (mounted) {
			document.title = `${appSettings.appName} - Manage your intelligent automation workflows`
		}
	}, [appSettings.appName, mounted])

	const updateAppSettings = (settings: Partial<AppSettings>) => {
		setAppSettings((prev) => {
			const updated = { ...prev, ...settings }
			localStorage.setItem("app-settings", JSON.stringify(updated))
			return updated
		})
	}

	const resetAppSettings = () => {
		setAppSettings(DEFAULT_SETTINGS)
		localStorage.removeItem("app-settings")
	}

	return (
		<AppContext.Provider
			value={{ appSettings, updateAppSettings, resetAppSettings }}
		>
			{children}
		</AppContext.Provider>
	)
}

export function useAppSettings() {
	const context = useContext(AppContext)
	if (!context) {
		throw new Error("useAppSettings must be used within AppProvider")
	}
	return context
}
