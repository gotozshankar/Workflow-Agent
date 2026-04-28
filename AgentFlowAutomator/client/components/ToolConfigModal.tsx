/**
 * ToolConfigModal Component
 * Modal for configuring a tool with credentials and settings
 */

import React, { useState, useEffect } from "react"
import { X, Check, AlertCircle, Loader2 } from "lucide-react"
import { Tool, ToolConfig, TestResult } from "../hooks/useToolConfig"

interface ToolConfigModalProps {
	tool: Tool | null
	isOpen: boolean
	onClose: () => void
	onSave: (
		credentials: string[],
		settings: Record<string, any>,
	) => Promise<boolean>
	onTest: (
		credentialId: string,
		settings: Record<string, any>,
	) => Promise<TestResult>
	availableCredentials: Array<{ id: string; name: string; type: string }>
	loading: boolean
	testLoading: boolean
	testResult: TestResult | null
}

export const ToolConfigModal: React.FC<ToolConfigModalProps> = ({
	tool,
	isOpen,
	onClose,
	onSave,
	onTest,
	availableCredentials,
	loading,
	testLoading,
	testResult,
}) => {
	const [selectedCredentials, setSelectedCredentials] = useState<string[]>([])
	const [settings, setSettings] = useState<Record<string, any>>({
		timeout: 30,
		retryCount: 1,
	})
	const [saving, setSaving] = useState(false)
	const [testing, setTesting] = useState(false)

	// Reset form when modal opens/closes
	useEffect(() => {
		if (isOpen) {
			setSelectedCredentials([])
			setSettings({ timeout: 30, retryCount: 1 })
		}
	}, [isOpen, tool])

	if (!isOpen || !tool) return null

	const handleCredentialToggle = (credentialId: string) => {
		setSelectedCredentials((prev) =>
			prev.includes(credentialId)
				? prev.filter((id) => id !== credentialId)
				: [...prev, credentialId],
		)
	}

	const handleSettingChange = (key: string, value: any) => {
		setSettings((prev) => ({
			...prev,
			[key]: value,
		}))
	}

	const handleSave = async () => {
		if (selectedCredentials.length === 0) {
			alert("Please select at least one credential")
			return
		}

		setSaving(true)
		const success = await onSave(selectedCredentials, settings)
		setSaving(false)

		if (success) {
			onClose()
		}
	}

	const handleTest = async () => {
		if (selectedCredentials.length === 0) {
			alert("Please select at least one credential to test")
			return
		}

		setTesting(true)
		await onTest(selectedCredentials[0], settings)
		setTesting(false)
	}

	const compatibleCredentials = availableCredentials.filter(
		(cred) =>
			cred.type.toLowerCase().includes(tool.id.toLowerCase()) ||
			tool.id.toLowerCase().includes(cred.type.toLowerCase()),
	)

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b">
					<div>
						<h2 className="text-2xl font-bold">Configure {tool.name}</h2>
						<p className="text-sm text-gray-500 mt-1">
							{tool.description}
						</p>
					</div>
					<button
						onClick={onClose}
						className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Body */}
				<div className="p-6 space-y-6">
					{/* Credentials Section */}
					<div>
						<h3 className="text-lg font-semibold mb-4">
							Select Credentials
						</h3>
						{compatibleCredentials.length > 0 ? (
							<div className="space-y-3">
								{compatibleCredentials.map((cred) => (
									<label
										key={cred.id}
										className="flex items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
									>
										<input
											type="checkbox"
											checked={selectedCredentials.includes(cred.id)}
											onChange={() =>
												handleCredentialToggle(cred.id)
											}
											className="w-5 h-5 rounded"
										/>
										<div className="ml-3">
											<p className="font-medium">{cred.name}</p>
											<p className="text-sm text-gray-500">
												{cred.type}
											</p>
										</div>
									</label>
								))}
							</div>
						) : (
							<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
								<p className="text-yellow-800">
									⚠️ No compatible credentials found. Please create
									credentials for {tool.name} first.
								</p>
							</div>
						)}
					</div>

					{/* Settings Section */}
					<div>
						<h3 className="text-lg font-semibold mb-4">Tool Settings</h3>
						<div className="space-y-4">
							{/* Timeout */}
							<div>
								<label className="block text-sm font-medium mb-2">
									Timeout (seconds)
								</label>
								<input
									type="number"
									min="1"
									max="300"
									value={settings.timeout}
									onChange={(e) =>
										handleSettingChange(
											"timeout",
											parseInt(e.target.value),
										)
									}
									className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
								<p className="text-xs text-gray-500 mt-1">
									Max time for tool execution
								</p>
							</div>

							{/* Retry Count */}
							<div>
								<label className="block text-sm font-medium mb-2">
									Retry Count
								</label>
								<input
									type="number"
									min="0"
									max="10"
									value={settings.retryCount}
									onChange={(e) =>
										handleSettingChange(
											"retryCount",
											parseInt(e.target.value),
										)
									}
									className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
								<p className="text-xs text-gray-500 mt-1">
									Number of retries on failure
								</p>
							</div>

							{/* Custom Settings */}
							<div>
								<label className="block text-sm font-medium mb-2">
									Additional Settings (JSON)
								</label>
								<textarea
									placeholder='{"customKey": "customValue"}'
									className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
									rows={3}
									defaultValue="{}"
								/>
								<p className="text-xs text-gray-500 mt-1">
									Optional custom configuration
								</p>
							</div>
						</div>
					</div>

					{/* Test Result */}
					{testResult && (
						<div
							className={`p-4 rounded-lg border ${
								testResult.success
									? "bg-green-50 border-green-200"
									: "bg-red-50 border-red-200"
							}`}
						>
							<div className="flex items-start gap-3">
								{testResult.success ? (
									<Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
								) : (
									<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
								)}
								<div>
									<p
										className={`font-medium ${
											testResult.success
												? "text-green-800"
												: "text-red-800"
										}`}
									>
										{testResult.message}
									</p>
									{testResult.error && (
										<p className="text-sm text-gray-700 mt-1">
											{testResult.error}
										</p>
									)}
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
					<button
						onClick={onClose}
						disabled={saving}
						className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
					>
						Cancel
					</button>

					<button
						onClick={handleTest}
						disabled={
							saving || testLoading || selectedCredentials.length === 0
						}
						className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
					>
						{testLoading && <Loader2 className="w-4 h-4 animate-spin" />}
						Test
					</button>

					<button
						onClick={handleSave}
						disabled={
							saving || loading || selectedCredentials.length === 0
						}
						className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
					>
						{saving && <Loader2 className="w-4 h-4 animate-spin" />}
						Save Configuration
					</button>
				</div>
			</div>
		</div>
	)
}
