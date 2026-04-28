/**
 * CredentialsPanel.tsx
 * Displays n8n credentials in the frontend UI
 * Features:
 * - List all available credentials
 * - Filter by type
 * - Test credentials
 * - Delete credentials
 * - Create new credentials
 * - Real-time sync with n8n backend
 */

import React, { useState, useEffect } from "react"
import styles from "./CredentialsPanel.module.css"

interface Credential {
	id: string
	name: string
	type: string
	createdAt: string
	updatedAt: string
	nodesAccess?: any[]
}

interface CredentialsPanelProps {
	onCredentialSelect?: (credential: Credential) => void
	autoRefresh?: number // milliseconds
	showActions?: boolean
}

const CREDENTIAL_TYPE_ICONS: Record<string, string> = {
	googleOAuth2: "📧",
	slackApi: "💬",
	postgresdb: "🗄️",
	mysql: "🗄️",
	ssh: "🔐",
	httpBasicAuth: "🔑",
	httpBearerAuth: "🔑",
	httpCustomAuth: "🔑",
	awsS3: "☁️",
	azureBlobStorage: "☁️",
	openAI: "🤖",
	slack: "💬",
	telegram: "📱",
	discord: "🎮",
}

export const CredentialsPanel: React.FC<CredentialsPanelProps> = ({
	onCredentialSelect,
	autoRefresh = 30000, // 30 seconds default
	showActions = true,
}) => {
	const [credentials, setCredentials] = useState<Credential[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [filterType, setFilterType] = useState<string>("all")
	const [validating, setValidating] = useState<string | null>(null)
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const [searchQuery, setSearchQuery] = useState("")

	const API_BASE = "http://localhost:5000/api/credentials"

	// Fetch credentials from backend
	const fetchCredentials = async (useCache = true) => {
		try {
			setLoading(true)
			setError(null)

			const url = `${API_BASE}?use_cache=${useCache}`
			const response = await fetch(url)

			if (!response.ok) {
				throw new Error(
					`Failed to fetch credentials: ${response.statusText}`,
				)
			}

			const data = await response.json()

			if (data.success) {
				setCredentials(data.credentials || [])
			} else {
				setError(data.error || "Failed to fetch credentials")
				setCredentials([])
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error")
			console.error("❌ Error fetching credentials:", err)
		} finally {
			setLoading(false)
		}
	}

	// Initial load
	useEffect(() => {
		fetchCredentials()
	}, [])

	// Auto-refresh
	useEffect(() => {
		if (autoRefresh <= 0) return

		const interval = setInterval(() => {
			fetchCredentials(true)
		}, autoRefresh)

		return () => clearInterval(interval)
	}, [autoRefresh])

	// Filter credentials
	const filteredCredentials = credentials.filter((cred) => {
		const matchesType = filterType === "all" || cred.type === filterType
		const matchesSearch =
			searchQuery === "" ||
			cred.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			cred.type.toLowerCase().includes(searchQuery.toLowerCase())
		return matchesType && matchesSearch
	})

	// Get unique types
	const credentialTypes = ["all", ...new Set(credentials.map((c) => c.type))]

	// Validate credential
	const handleValidate = async (credentialId: string) => {
		try {
			setValidating(credentialId)

			const response = await fetch(`${API_BASE}/${credentialId}/validate`, {
				method: "POST",
			})

			const data = await response.json()

			if (data.success && data.valid) {
				alert(`✅ Credential "${credentialId}" is valid and working!`)
			} else {
				alert(
					`❌ Credential validation failed: ${data.message || data.error}`,
				)
			}
		} catch (err) {
			alert(`❌ Error validating credential: ${err}`)
		} finally {
			setValidating(null)
		}
	}

	// Delete credential
	const handleDelete = async (
		credentialId: string,
		credentialName: string,
	) => {
		if (
			!window.confirm(`Are you sure you want to delete "${credentialName}"?`)
		) {
			return
		}

		try {
			const response = await fetch(`${API_BASE}/${credentialId}`, {
				method: "DELETE",
			})

			const data = await response.json()

			if (data.success) {
				alert(`✅ Credential deleted successfully!`)
				// Refresh the list
				await fetchCredentials(false) // Force refresh from backend
			} else {
				alert(`❌ Failed to delete credential: ${data.error}`)
			}
		} catch (err) {
			alert(`❌ Error deleting credential: ${err}`)
		}
	}

	// Refresh cache
	const handleRefresh = async () => {
		await fetchCredentials(false)
	}

	return (
		<div className={styles.panel}>
			<div className={styles.header}>
				<h2>🔐 N8N Credentials</h2>
				<div className={styles.headerActions}>
					<button
						className={styles.refreshBtn}
						onClick={handleRefresh}
						disabled={loading}
						title="Refresh credentials from n8n"
					>
						🔄 Refresh
					</button>
					<button
						className={styles.newBtn}
						onClick={() => {
							/* TODO: Open create credential modal */
						}}
						title="Create new credential"
					>
						➕ New
					</button>
				</div>
			</div>

			{error && (
				<div className={styles.error}>
					⚠️ {error}
					<button onClick={() => setError(null)}>✕</button>
				</div>
			)}

			{loading ? (
				<div className={styles.loading}>Loading credentials...</div>
			) : (
				<>
					{/* Search & Filter */}
					<div className={styles.controls}>
						<input
							type="text"
							placeholder="Search credentials..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className={styles.search}
						/>

						<select
							value={filterType}
							onChange={(e) => setFilterType(e.target.value)}
							className={styles.filter}
						>
							{credentialTypes.map((type) => (
								<option key={type} value={type}>
									{type === "all" ? "All Types" : type}
								</option>
							))}
						</select>
					</div>

					{/* Credentials List */}
					{filteredCredentials.length === 0 ? (
						<div className={styles.empty}>No credentials found</div>
					) : (
						<div className={styles.list}>
							{filteredCredentials.map((cred) => (
								<div
									key={cred.id}
									className={`${styles.credentialCard} ${
										selectedId === cred.id ? styles.selected : ""
									}`}
									onClick={() => {
										setSelectedId(cred.id)
										onCredentialSelect?.(cred)
									}}
								>
									<div className={styles.credentialInfo}>
										<div className={styles.credentialHeader}>
											<span className={styles.icon}>
												{CREDENTIAL_TYPE_ICONS[cred.type] || "🔑"}
											</span>
											<div>
												<div className={styles.name}>
													{cred.name}
												</div>
												<div className={styles.type}>
													{cred.type}
												</div>
											</div>
										</div>

										<div className={styles.timestamps}>
											<small>
												Created:{" "}
												{new Date(
													cred.createdAt,
												).toLocaleDateString()}
											</small>
											<small>
												Updated:{" "}
												{new Date(
													cred.updatedAt,
												).toLocaleDateString()}
											</small>
										</div>
									</div>

									{showActions && (
										<div className={styles.actions}>
											<button
												className={`${styles.actionBtn} ${styles.validate}`}
												onClick={(e) => {
													e.stopPropagation()
													handleValidate(cred.id)
												}}
												disabled={validating === cred.id}
												title="Test this credential"
											>
												{validating === cred.id ? "⏳" : "✔️"}
											</button>

											<button
												className={`${styles.actionBtn} ${styles.delete}`}
												onClick={(e) => {
													e.stopPropagation()
													handleDelete(cred.id, cred.name)
												}}
												title="Delete this credential"
											>
												🗑️
											</button>

											<button
												className={`${styles.actionBtn} ${styles.copy}`}
												onClick={(e) => {
													e.stopPropagation()
													navigator.clipboard.writeText(cred.id)
													alert("Credential ID copied!")
												}}
												title="Copy credential ID"
											>
												📋
											</button>
										</div>
									)}
								</div>
							))}
						</div>
					)}

					{/* Summary */}
					<div className={styles.summary}>
						Showing {filteredCredentials.length} of {credentials.length}{" "}
						credentials
					</div>
				</>
			)}
		</div>
	)
}

export default CredentialsPanel
