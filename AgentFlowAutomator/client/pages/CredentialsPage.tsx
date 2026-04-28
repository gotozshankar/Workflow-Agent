/**
 * CredentialsPage.tsx
 * Complete page for managing n8n credentials
 * Shows credentials and allows management
 */

import React, { useState } from "react"
import CredentialsPanel from "../components/CredentialsPanel"
import useCredentials from "../hooks/useCredentials"
import styles from "./CredentialsPage.module.css"

interface Credential {
	id: string
	name: string
	type: string
	createdAt: string
	updatedAt: string
}

const CredentialsPage: React.FC = () => {
	const [selectedCredential, setSelectedCredential] =
		useState<Credential | null>(null)
	const [showDetails, setShowDetails] = useState(false)

	const {
		credentials,
		loading,
		error,
		lastUpdate,
		validateCredential,
		deleteCredential,
		refreshCache,
	} = useCredentials({
		autoFetch: true,
		autoRefreshInterval: 30000, // Refresh every 30 seconds
		onError: (error) => console.error("Credentials Error:", error),
	})

	const handleCredentialSelect = (credential: Credential) => {
		setSelectedCredential(credential)
		setShowDetails(true)
	}

	const handleValidateSelected = async () => {
		if (!selectedCredential) return

		const result = await validateCredential(selectedCredential.id)
		alert(result.success ? `✅ ${result.message}` : `❌ ${result.message}`)
	}

	const handleDeleteSelected = async () => {
		if (!selectedCredential) return

		if (!window.confirm(`Delete "${selectedCredential.name}"?`)) return

		const success = await deleteCredential(selectedCredential.id)
		if (success) {
			alert("✅ Credential deleted!")
			setSelectedCredential(null)
			setShowDetails(false)
		}
	}

	return (
		<div className={styles.page}>
			<div className={styles.container}>
				{/* Main Panel */}
				<div className={styles.mainPanel}>
					<CredentialsPanel
						onCredentialSelect={handleCredentialSelect}
						autoRefresh={30000}
						showActions={true}
					/>
				</div>

				{/* Detail Panel */}
				{showDetails && selectedCredential && (
					<div className={styles.detailPanel}>
						<div className={styles.detailHeader}>
							<h3>📋 Credential Details</h3>
							<button
								className={styles.closeBtn}
								onClick={() => setShowDetails(false)}
							>
								✕
							</button>
						</div>

						<div className={styles.detailContent}>
							<div className={styles.detailRow}>
								<label>Name:</label>
								<span>{selectedCredential.name}</span>
							</div>

							<div className={styles.detailRow}>
								<label>Type:</label>
								<span className={styles.badgeType}>
									{selectedCredential.type}
								</span>
							</div>

							<div className={styles.detailRow}>
								<label>ID:</label>
								<code className={styles.code}>
									{selectedCredential.id}
								</code>
								<button
									className={styles.copyBtn}
									onClick={() => {
										navigator.clipboard.writeText(
											selectedCredential.id,
										)
										alert("Copied to clipboard!")
									}}
								>
									📋 Copy
								</button>
							</div>

							<div className={styles.detailRow}>
								<label>Created:</label>
								<span>
									{new Date(
										selectedCredential.createdAt,
									).toLocaleString()}
								</span>
							</div>

							<div className={styles.detailRow}>
								<label>Updated:</label>
								<span>
									{new Date(
										selectedCredential.updatedAt,
									).toLocaleString()}
								</span>
							</div>

							<div className={styles.detailActions}>
								<button
									className={styles.validateBtn}
									onClick={handleValidateSelected}
								>
									✔️ Validate
								</button>
								<button
									className={styles.deleteBtn}
									onClick={handleDeleteSelected}
								>
									🗑️ Delete
								</button>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Stats Footer */}
			<div className={styles.footer}>
				<div className={styles.stats}>
					<span>📊 Total: {credentials.length}</span>
					<span>
						🔄 Last update:{" "}
						{lastUpdate ? lastUpdate.toLocaleTimeString() : "Never"}
					</span>
					<span>{loading ? "⏳ Loading..." : "✅ Ready"}</span>
				</div>

				<button
					className={styles.refreshFooterBtn}
					onClick={refreshCache}
					disabled={loading}
				>
					🔄 Force Refresh
				</button>
			</div>

			{error && <div className={styles.errorBanner}>⚠️ {error}</div>}
		</div>
	)
}

export default CredentialsPage
