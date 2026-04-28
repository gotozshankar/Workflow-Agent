/**
 * ToolConfigManager Component
 * Advanced tool configuration management with export/import/scheduling
 */

import React, { useState, useRef } from "react"
import {
	Download,
	Upload,
	Clock,
	Plus,
	Trash2,
	Edit2,
	AlertCircle,
	CheckCircle,
	Save,
	X,
	Calendar,
	Repeat,
} from "lucide-react"

interface ScheduleConfig {
	type: "once" | "interval" | "cron"
	interval?: number
	unit?: "minutes" | "hours" | "days"
	cronExpression?: string
	nextRun?: string
}

interface Schedule {
	id: string
	toolId: string
	name: string
	enabled: boolean
	scheduleConfig: ScheduleConfig
	createdAt: string
	lastRun?: string
}

interface ToolExportData {
	id: string
	name: string
	description?: string
	config: Record<string, any>
	exportedAt: string
	version: string
}

const ScheduleModal: React.FC<{
	isOpen: boolean
	toolId: string
	schedule?: Schedule
	onSave: (schedule: Omit<Schedule, "id">) => void
	onClose: () => void
}> = ({ isOpen, toolId, schedule, onSave, onClose }) => {
	const [formData, setFormData] = useState({
		name: schedule?.name || "",
		scheduleType: (schedule?.scheduleConfig.type || "interval") as
			| "once"
			| "interval"
			| "cron",
		interval: schedule?.scheduleConfig.interval || 1,
		unit: (schedule?.scheduleConfig.unit || "hours") as
			| "minutes"
			| "hours"
			| "days",
		cronExpression: schedule?.scheduleConfig.cronExpression || "",
		enabled: schedule?.enabled ?? true,
	})

	const [errors, setErrors] = useState<string[]>([])

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		const newErrors: string[] = []

		if (!formData.name.trim()) {
			newErrors.push("Schedule name is required")
		}

		if (formData.scheduleType === "cron" && !formData.cronExpression) {
			newErrors.push("Cron expression is required for cron schedules")
		}

		if (formData.scheduleType === "interval" && formData.interval <= 0) {
			newErrors.push("Interval must be greater than 0")
		}

		setErrors(newErrors)

		if (newErrors.length === 0) {
			const scheduleConfig: ScheduleConfig = {
				type: formData.scheduleType,
			}

			if (formData.scheduleType === "interval") {
				scheduleConfig.interval = formData.interval
				scheduleConfig.unit = formData.unit
			} else if (formData.scheduleType === "cron") {
				scheduleConfig.cronExpression = formData.cronExpression
			}

			onSave({
				toolId,
				name: formData.name,
				enabled: formData.enabled,
				scheduleConfig,
				createdAt: schedule?.createdAt || new Date().toISOString(),
			})

			onClose()
		}
	}

	if (!isOpen) return null

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg p-6 w-full max-w-md">
				<h2 className="text-xl font-bold mb-4">
					{schedule ? "Edit Schedule" : "Create Schedule"}
				</h2>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium mb-1">
							Schedule Name
						</label>
						<input
							type="text"
							value={formData.name}
							onChange={(e) =>
								setFormData({ ...formData, name: e.target.value })
							}
							className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="e.g., Daily Report"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium mb-1">Type</label>
						<select
							value={formData.scheduleType}
							onChange={(e) =>
								setFormData({
									...formData,
									scheduleType: e.target.value as
										| "once"
										| "interval"
										| "cron",
								})
							}
							className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="once">One Time</option>
							<option value="interval">
								Every X Minutes/Hours/Days
							</option>
							<option value="cron">Cron Expression</option>
						</select>
					</div>

					{formData.scheduleType === "interval" && (
						<>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium mb-1">
										Interval
									</label>
									<input
										type="number"
										min="1"
										value={formData.interval}
										onChange={(e) =>
											setFormData({
												...formData,
												interval: parseInt(e.target.value) || 1,
											})
										}
										className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium mb-1">
										Unit
									</label>
									<select
										value={formData.unit}
										onChange={(e) =>
											setFormData({
												...formData,
												unit: e.target.value as
													| "minutes"
													| "hours"
													| "days",
											})
										}
										className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
									>
										<option value="minutes">Minutes</option>
										<option value="hours">Hours</option>
										<option value="days">Days</option>
									</select>
								</div>
							</div>
						</>
					)}

					{formData.scheduleType === "cron" && (
						<div>
							<label className="block text-sm font-medium mb-1">
								Cron Expression
							</label>
							<input
								type="text"
								value={formData.cronExpression}
								onChange={(e) =>
									setFormData({
										...formData,
										cronExpression: e.target.value,
									})
								}
								className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
								placeholder="0 0 * * * (crontab format)"
							/>
							<p className="text-xs text-gray-500 mt-1">
								Format: minute hour day month day-of-week
							</p>
						</div>
					)}

					<div className="flex items-center gap-2">
						<input
							type="checkbox"
							id="enabled"
							checked={formData.enabled}
							onChange={(e) =>
								setFormData({ ...formData, enabled: e.target.checked })
							}
							className="rounded"
						/>
						<label htmlFor="enabled" className="text-sm">
							Enable this schedule
						</label>
					</div>

					{errors.length > 0 && (
						<div className="p-3 bg-red-50 border border-red-200 rounded-lg">
							{errors.map((error, i) => (
								<p key={i} className="text-sm text-red-700">
									• {error}
								</p>
							))}
						</div>
					)}

					<div className="flex gap-2 pt-4">
						<button
							type="submit"
							className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
						>
							<Save className="w-4 h-4" />
							Save Schedule
						</button>
						<button
							type="button"
							onClick={onClose}
							className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}

export const ToolConfigManager: React.FC<{
	toolId: string
	toolName: string
}> = ({ toolId, toolName }) => {
	const [schedules, setSchedules] = useState<Schedule[]>([])
	const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
	const [selectedSchedule, setSelectedSchedule] = useState<Schedule>()
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState<{
		type: "success" | "error"
		text: string
	}>()
	const fileInputRef = useRef<HTMLInputElement>(null)

	// Load schedules
	const loadSchedules = async () => {
		try {
			const response = await fetch(`/api/tools/${toolId}/schedules`, {
				headers: {
					Authorization: `Bearer ${localStorage.getItem("token")}`,
				},
			})

			if (response.ok) {
				const data = await response.json()
				setSchedules(data.schedules || [])
			}
		} catch (error) {
			setMessage({
				type: "error",
				text: "Failed to load schedules",
			})
		}
	}

	// Export tool config
	const handleExport = async () => {
		try {
			setLoading(true)
			const response = await fetch(`/api/tools/${toolId}/export`, {
				headers: {
					Authorization: `Bearer ${localStorage.getItem("token")}`,
				},
			})

			if (response.ok) {
				const data = await response.json()
				const exportData = data.data
				const jsonString = JSON.stringify(exportData, null, 2)
				const blob = new Blob([jsonString], { type: "application/json" })
				const url = URL.createObjectURL(blob)
				const link = document.createElement("a")
				link.href = url
				link.download = `${toolId}-config-${new Date().toISOString().split("T")[0]}.json`
				link.click()
				URL.revokeObjectURL(url)

				setMessage({
					type: "success",
					text: "Configuration exported successfully",
				})
			}
		} catch (error) {
			setMessage({
				type: "error",
				text: "Failed to export configuration",
			})
		} finally {
			setLoading(false)
		}
	}

	// Import tool config
	const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return

		const reader = new FileReader()
		reader.onload = async (e) => {
			try {
				setLoading(true)
				const json = JSON.parse(e.target?.result as string)

				const response = await fetch(`/api/tools/import`, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${localStorage.getItem("token")}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify(json),
				})

				if (response.ok) {
					setMessage({
						type: "success",
						text: "Configuration imported successfully",
					})
				} else {
					setMessage({
						type: "error",
						text: "Failed to import configuration",
					})
				}
			} catch (error) {
				setMessage({
					type: "error",
					text: "Invalid configuration file",
				})
			} finally {
				setLoading(false)
				if (fileInputRef.current) {
					fileInputRef.current.value = ""
				}
			}
		}
		reader.readAsText(file)
	}

	// Save schedule
	const handleSaveSchedule = async (schedule: Omit<Schedule, "id">) => {
		try {
			setLoading(true)

			if (selectedSchedule) {
				// Update existing
				const response = await fetch(
					`/api/tools/${toolId}/schedule/${selectedSchedule.id}`,
					{
						method: "PUT",
						headers: {
							Authorization: `Bearer ${localStorage.getItem("token")}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify(schedule),
					},
				)

				if (response.ok) {
					setMessage({
						type: "success",
						text: "Schedule updated successfully",
					})
					await loadSchedules()
				}
			} else {
				// Create new
				const response = await fetch(`/api/tools/${toolId}/schedule`, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${localStorage.getItem("token")}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify(schedule),
				})

				if (response.ok) {
					setMessage({
						type: "success",
						text: "Schedule created successfully",
					})
					await loadSchedules()
				}
			}
		} catch (error) {
			setMessage({
				type: "error",
				text: "Failed to save schedule",
			})
		} finally {
			setLoading(false)
			setSelectedSchedule(undefined)
		}
	}

	// Delete schedule
	const handleDeleteSchedule = async (scheduleId: string) => {
		if (confirm("Delete this schedule?")) {
			try {
				setLoading(true)
				const response = await fetch(
					`/api/tools/${toolId}/schedule/${scheduleId}`,
					{
						method: "DELETE",
						headers: {
							Authorization: `Bearer ${localStorage.getItem("token")}`,
						},
					},
				)

				if (response.ok) {
					setMessage({
						type: "success",
						text: "Schedule deleted successfully",
					})
					await loadSchedules()
				}
			} catch (error) {
				setMessage({
					type: "error",
					text: "Failed to delete schedule",
				})
			} finally {
				setLoading(false)
			}
		}
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h2 className="text-2xl font-bold mb-2">Configuration Manager</h2>
				<p className="text-gray-600">
					Manage configurations and schedules for {toolName}
				</p>
			</div>

			{/* Messages */}
			{message && (
				<div
					className={`p-4 rounded-lg flex items-start justify-between ${
						message.type === "success"
							? "bg-green-50 border border-green-200"
							: "bg-red-50 border border-red-200"
					}`}
				>
					<div className="flex gap-3">
						{message.type === "success" ? (
							<CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
						) : (
							<AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
						)}
						<p
							className={
								message.type === "success"
									? "text-green-700"
									: "text-red-700"
							}
						>
							{message.text}
						</p>
					</div>
					<button
						onClick={() => setMessage(undefined)}
						className="text-gray-400 hover:text-gray-600"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
			)}

			{/* Export/Import Section */}
			<div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
				<h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
					<Download className="w-5 h-5" />
					Export & Import
				</h3>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<button
						onClick={handleExport}
						disabled={loading}
						className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
					>
						<Download className="w-4 h-4" />
						Export Configuration
					</button>

					<button
						onClick={() => fileInputRef.current?.click()}
						disabled={loading}
						className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
					>
						<Upload className="w-4 h-4" />
						Import Configuration
					</button>

					<input
						ref={fileInputRef}
						type="file"
						accept=".json"
						onChange={handleImport}
						className="hidden"
					/>
				</div>

				<p className="text-sm text-gray-600 mt-4">
					💡 Export your tool configuration as JSON to backup or share with
					team members. Import to restore or replicate configurations.
				</p>
			</div>

			{/* Schedules Section */}
			<div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-semibold flex items-center gap-2">
						<Clock className="w-5 h-5" />
						Automation Schedules
					</h3>
					<button
						onClick={() => {
							setSelectedSchedule(undefined)
							setScheduleModalOpen(true)
						}}
						className="flex items-center gap-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
					>
						<Plus className="w-4 h-4" />
						New Schedule
					</button>
				</div>

				{schedules.length === 0 ? (
					<p className="text-gray-600 text-center py-4">
						No schedules configured yet. Create one to automate your
						workflows.
					</p>
				) : (
					<div className="space-y-3">
						{schedules.map((schedule) => (
							<div
								key={schedule.id}
								className="p-4 bg-white border rounded-lg flex items-center justify-between"
							>
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-1">
										<h4 className="font-medium">{schedule.name}</h4>
										{schedule.enabled ? (
											<span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
												<div className="w-2 h-2 bg-green-500 rounded-full" />
												Active
											</span>
										) : (
											<span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-700 text-xs rounded">
												<div className="w-2 h-2 bg-gray-500 rounded-full" />
												Inactive
											</span>
										)}
									</div>

									<div className="flex items-center gap-4 text-sm text-gray-600">
										<div className="flex items-center gap-1">
											<Repeat className="w-4 h-4" />
											<span>
												{schedule.scheduleConfig.type === "interval"
													? `Every ${schedule.scheduleConfig.interval} ${schedule.scheduleConfig.unit}`
													: schedule.scheduleConfig.type === "cron"
														? schedule.scheduleConfig
																.cronExpression
														: "One time"}
											</span>
										</div>

										{schedule.lastRun && (
											<div className="flex items-center gap-1">
												<Calendar className="w-4 h-4" />
												<span>
													Last run:{" "}
													{new Date(
														schedule.lastRun,
													).toLocaleDateString()}
												</span>
											</div>
										)}
									</div>
								</div>

								<div className="flex gap-2">
									<button
										onClick={() => {
											setSelectedSchedule(schedule)
											setScheduleModalOpen(true)
										}}
										className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
									>
										<Edit2 className="w-4 h-4" />
									</button>
									<button
										onClick={() => handleDeleteSchedule(schedule.id)}
										className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
									>
										<Trash2 className="w-4 h-4" />
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			<ScheduleModal
				isOpen={scheduleModalOpen}
				toolId={toolId}
				schedule={selectedSchedule}
				onSave={handleSaveSchedule}
				onClose={() => {
					setScheduleModalOpen(false)
					setSelectedSchedule(undefined)
				}}
			/>
		</div>
	)
}
