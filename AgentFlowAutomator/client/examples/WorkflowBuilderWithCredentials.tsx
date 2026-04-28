/**
 * WorkflowBuilderWithCredentials.tsx
 * Example: Integrating credentials selector into workflow builder
 */

import React, { useState } from "react"
import CredentialsPanel from "../components/CredentialsPanel"
import useCredentials from "../hooks/useCredentials"

interface Credential {
	id: string
	name: string
	type: string
}

interface WorkflowNode {
	id: string
	name: string
	type: string
	credentialIds?: string[]
	parameters?: Record<string, any>
}

const WorkflowBuilderWithCredentials: React.FC = () => {
	const [nodes, setNodes] = useState<WorkflowNode[]>([])
	const [selectedNode, setSelectedNode] = useState<string | null>(null)
	const [showCredentialSelector, setShowCredentialSelector] = useState(false)

	const { credentials } = useCredentials({
		autoFetch: true,
		autoRefreshInterval: 30000,
	})

	const currentNode = nodes.find((n) => n.id === selectedNode)

	/**
	 * Handle credential selection for the current node
	 */
	const handleAddCredentialToNode = (credential: Credential) => {
		if (!selectedNode) return

		setNodes(
			nodes.map((node) =>
				node.id === selectedNode
					? {
							...node,
							credentialIds: [
								...(node.credentialIds || []),
								credential.id,
							],
						}
					: node,
			),
		)

		alert(
			`✅ Added credential "${credential.name}" to node "${currentNode?.name}"`,
		)
		setShowCredentialSelector(false)
	}

	/**
	 * Remove credential from node
	 */
	const handleRemoveCredential = (credentialId: string) => {
		if (!selectedNode) return

		setNodes(
			nodes.map((node) =>
				node.id === selectedNode
					? {
							...node,
							credentialIds: (node.credentialIds || []).filter(
								(id) => id !== credentialId,
							),
						}
					: node,
			),
		)
	}

	/**
	 * Get credential details
	 */
	const getCredentialName = (credentialId: string) => {
		return (
			credentials.find((c) => c.id === credentialId)?.name || credentialId
		)
	}

	return (
		<div style={{ display: "flex", gap: "20px", height: "100%" }}>
			{/* Left: Workflow Canvas */}
			<div
				style={{
					flex: 1,
					border: "1px solid #ddd",
					padding: "20px",
					borderRadius: "8px",
				}}
			>
				<h2>📐 Workflow Builder</h2>

				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, 200px)",
						gap: "15px",
					}}
				>
					{nodes.map((node) => (
						<div
							key={node.id}
							onClick={() => setSelectedNode(node.id)}
							style={{
								padding: "15px",
								border:
									selectedNode === node.id
										? "2px solid #3498db"
										: "1px solid #bdc3c7",
								borderRadius: "8px",
								cursor: "pointer",
								background:
									selectedNode === node.id ? "#ecf0f1" : "white",
								transition: "all 0.3s ease",
							}}
						>
							<div style={{ fontWeight: 600, marginBottom: "5px" }}>
								{node.name}
							</div>
							<div
								style={{
									fontSize: "0.85em",
									color: "#7f8c8d",
									marginBottom: "10px",
								}}
							>
								Type: {node.type}
							</div>

							{node.credentialIds && node.credentialIds.length > 0 && (
								<div
									style={{
										fontSize: "0.8em",
										color: "#27ae60",
										fontWeight: 500,
									}}
								>
									✓ {node.credentialIds.length} credential(s)
								</div>
							)}
						</div>
					))}

					{/* Add Node Button */}
					<div
						onClick={() => {
							const newNode: WorkflowNode = {
								id: `node-${Date.now()}`,
								name: `Node ${nodes.length + 1}`,
								type: "action",
								credentialIds: [],
							}
							setNodes([...nodes, newNode])
						}}
						style={{
							padding: "15px",
							border: "2px dashed #3498db",
							borderRadius: "8px",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontSize: "2em",
							background: "#ecf0f1",
							transition: "all 0.3s ease",
						}}
					>
						➕
					</div>
				</div>
			</div>

			{/* Right: Node Details & Credentials */}
			<div
				style={{
					width: "350px",
					border: "1px solid #ddd",
					padding: "20px",
					borderRadius: "8px",
					overflowY: "auto",
				}}
			>
				{selectedNode && currentNode ? (
					<>
						<h3>📋 Node Details</h3>

						<div style={{ marginBottom: "20px" }}>
							<label
								style={{
									fontWeight: 600,
									fontSize: "0.9em",
									textTransform: "uppercase",
									color: "#7f8c8d",
								}}
							>
								Node Name
							</label>
							<input
								type="text"
								value={currentNode.name}
								onChange={(e) =>
									setNodes(
										nodes.map((n) =>
											n.id === selectedNode
												? { ...n, name: e.target.value }
												: n,
										),
									)
								}
								style={{
									width: "100%",
									padding: "8px",
									marginTop: "5px",
									borderRadius: "4px",
									border: "1px solid #bdc3c7",
								}}
							/>
						</div>

						<div style={{ marginBottom: "20px" }}>
							<label
								style={{
									fontWeight: 600,
									fontSize: "0.9em",
									textTransform: "uppercase",
									color: "#7f8c8d",
								}}
							>
								Node Type
							</label>
							<select
								value={currentNode.type}
								onChange={(e) =>
									setNodes(
										nodes.map((n) =>
											n.id === selectedNode
												? { ...n, type: e.target.value }
												: n,
										),
									)
								}
								style={{
									width: "100%",
									padding: "8px",
									marginTop: "5px",
									borderRadius: "4px",
									border: "1px solid #bdc3c7",
								}}
							>
								<option value="trigger">Trigger</option>
								<option value="action">Action</option>
								<option value="condition">Condition</option>
								<option value="transform">Transform</option>
							</select>
						</div>

						{/* Credentials Section */}
						<div style={{ marginBottom: "15px" }}>
							<h4 style={{ marginTop: 0, marginBottom: "10px" }}>
								🔐 Credentials
							</h4>

							{currentNode.credentialIds &&
							currentNode.credentialIds.length > 0 ? (
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "8px",
										marginBottom: "15px",
									}}
								>
									{currentNode.credentialIds.map((credId) => (
										<div
											key={credId}
											style={{
												display: "flex",
												justifyContent: "space-between",
												alignItems: "center",
												padding: "8px 12px",
												background: "#d5f4e6",
												border: "1px solid #27ae60",
												borderRadius: "4px",
												fontSize: "0.9em",
											}}
										>
											<span>{getCredentialName(credId)}</span>
											<button
												onClick={() =>
													handleRemoveCredential(credId)
												}
												style={{
													background: "none",
													border: "none",
													color: "#c0392b",
													cursor: "pointer",
													fontSize: "1.2em",
													padding: "0",
													lineHeight: 1,
												}}
											>
												✕
											</button>
										</div>
									))}
								</div>
							) : (
								<div
									style={{
										color: "#7f8c8d",
										fontSize: "0.9em",
										marginBottom: "15px",
									}}
								>
									No credentials assigned
								</div>
							)}

							<button
								onClick={() =>
									setShowCredentialSelector(!showCredentialSelector)
								}
								style={{
									width: "100%",
									padding: "10px",
									background: "#3498db",
									color: "white",
									border: "none",
									borderRadius: "4px",
									cursor: "pointer",
									fontWeight: 600,
								}}
							>
								{showCredentialSelector
									? "✕ Hide Credentials"
									: "➕ Add Credential"}
							</button>
						</div>

						{/* Credentials Selector */}
						{showCredentialSelector && (
							<div
								style={{
									marginTop: "15px",
									padding: "15px",
									background: "#f5f6fa",
									borderRadius: "8px",
									maxHeight: "300px",
									overflowY: "auto",
								}}
							>
								<h5 style={{ marginTop: 0, marginBottom: "10px" }}>
									Select Credential:
								</h5>
								{credentials.map((cred) => (
									<div
										key={cred.id}
										onClick={() => handleAddCredentialToNode(cred)}
										style={{
											padding: "10px",
											marginBottom: "8px",
											background: "white",
											border: "1px solid #bdc3c7",
											borderRadius: "4px",
											cursor: "pointer",
											transition: "all 0.2s ease",
										}}
										onMouseEnter={(e) => {
											e.currentTarget.style.background = "#ecf0f1"
											e.currentTarget.style.borderColor = "#3498db"
										}}
										onMouseLeave={(e) => {
											e.currentTarget.style.background = "white"
											e.currentTarget.style.borderColor = "#bdc3c7"
										}}
									>
										<div
											style={{ fontWeight: 600, fontSize: "0.9em" }}
										>
											{cred.name}
										</div>
										<div
											style={{ fontSize: "0.8em", color: "#7f8c8d" }}
										>
											{cred.type}
										</div>
									</div>
								))}
							</div>
						)}

						<button
							onClick={() =>
								setNodes(nodes.filter((n) => n.id !== selectedNode))
							}
							style={{
								width: "100%",
								padding: "10px",
								marginTop: "15px",
								background: "#e74c3c",
								color: "white",
								border: "none",
								borderRadius: "4px",
								cursor: "pointer",
								fontWeight: 600,
							}}
						>
							🗑️ Delete Node
						</button>
					</>
				) : (
					<div
						style={{
							color: "#7f8c8d",
							textAlign: "center",
							marginTop: "50px",
						}}
					>
						Select a node to configure credentials
					</div>
				)}
			</div>
		</div>
	)
}

export default WorkflowBuilderWithCredentials
