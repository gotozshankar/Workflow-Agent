/**
 * ToolConfigurationPanel Component
 * Main UI for managing tool configurations
 */

import React, { useState, useEffect } from "react"
import {
	Search,
	Plus,
	Settings,
	Trash2,
	CheckCircle,
	Circle,
	Loader2,
} from "lucide-react"
import { useToolConfig, Tool } from "../hooks/useToolConfig"
import { useCredentials } from "./useCredentials"
import { ToolConfigModal } from "./ToolConfigModal"

interface ToolsGridProps {
	tools: Tool[]
	loading: boolean
	onConfigure: (tool: Tool) => void
	onDelete: (toolId: string) => void
	searchTerm: string
	setSearchTerm: (term: string) => void
	selectedCategory: string
	setSelectedCategory: (category: string) => void
}

const ToolsGrid: React.FC<ToolsGridProps> = ({
	tools,
	loading,
	onConfigure,
	onDelete,
	searchTerm,
	setSearchTerm,
	selectedCategory,
	setSelectedCategory,
}) => {
	const categories = Array.from(new Set(tools.map((t) => t.category)))
	const filteredTools = tools.filter(
		(tool) =>
			(selectedCategory === "all" || tool.category === selectedCategory) &&
			tool.name.toLowerCase().includes(searchTerm.toLowerCase()),
	)

	return (
		<div className="space-y-6">
			{/* Search & Filter */}
			<div className="flex gap-4">
				<div className="flex-1 relative">
					<Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
					<input
						type="text"
						placeholder="Search tools..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<select
					value={selectedCategory}
					onChange={(e) => setSelectedCategory(e.target.value)}
					className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					<option value="all">All Categories</option>
					{categories.map((cat) => (
						<option key={cat} value={cat}>
							{cat}
						</option>
					))}
				</select>
			</div>

			{/* Tools Grid */}
			{loading ? (
				<div className="flex items-center justify-center py-12">
					<Loader2 className="w-8 h-8 animate-spin text-blue-500" />
				</div>
			) : filteredTools.length === 0 ? (
				<div className="text-center py-12">
					<p className="text-gray-500">No tools found</p>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{filteredTools.map((tool) => (
						<div
							key={tool.id}
							className="p-4 border rounded-lg hover:shadow-lg transition-shadow"
						>
							<div className="flex items-start justify-between mb-2">
								<h3 className="font-semibold text-lg">{tool.name}</h3>
								{tool.configured ? (
									<CheckCircle className="w-5 h-5 text-green-500" />
								) : (
									<Circle className="w-5 h-5 text-gray-300" />
								)}
							</div>

							<p className="text-sm text-gray-600 mb-3">
								{tool.description}
							</p>

							<div className="flex items-center gap-2 mb-4">
								<span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
									{tool.category}
								</span>
								<span className="text-xs text-gray-500">
									{tool.configured
										? "✅ Configured"
										: "⚪ Not Configured"}
								</span>
							</div>

							<div className="flex gap-2">
								<button
									onClick={() => onConfigure(tool)}
									className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
								>
									<Settings className="w-4 h-4" />
									Configure
								</button>
								{tool.configured && (
									<button
										onClick={() => onDelete(tool.id)}
										className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors"
									>
										<Trash2 className="w-4 h-4" />
									</button>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

export const ToolConfigurationPanel: React.FC = () => {
	const {
		tools,
		loading,
		error,
		testLoading,
		testResult,
		saveToolConfig,
		deleteToolConfig,
		testToolConfig,
		clearError,
		clearTestResult,
	} = useToolConfig()

	const { credentials } = useCredentials()

	const [selectedTool, setSelectedTool] = useState<Tool | null>(null)
	const [modalOpen, setModalOpen] = useState(false)
	const [searchTerm, setSearchTerm] = useState("")
	const [selectedCategory, setSelectedCategory] = useState("all")
	const [deleting, setDeleting] = useState(false)

	const handleConfigure = (tool: Tool) => {
		setSelectedTool(tool)
		setModalOpen(true)
		clearTestResult()
	}

	const handleSaveConfig = async (
		credentialIds: string[],
		settings: Record<string, any>,
	) => {
		if (!selectedTool) return false

		const success = await saveToolConfig(
			selectedTool.id,
			credentialIds,
			settings,
		)
		if (success) {
			setModalOpen(false)
			setSelectedTool(null)
		}
		return success
	}

	const handleTestConfig = async (
		credentialId: string,
		settings: Record<string, any>,
	) => {
		if (!selectedTool) return { success: false, message: "No tool selected" }

		return await testToolConfig(selectedTool.id, credentialId, settings)
	}

	const handleDeleteConfig = async (toolId: string) => {
		if (confirm("Delete this tool configuration?")) {
			setDeleting(true)
			await deleteToolConfig(toolId)
			setDeleting(false)
		}
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">🛠️ Tools & Integrations</h1>
					<p className="text-gray-600 mt-2">
						Configure n8n tools with credentials and custom settings
					</p>
				</div>
				<div className="text-right">
					<p className="text-2xl font-bold text-blue-600">
						{tools.length}
					</p>
					<p className="text-sm text-gray-600">Available Tools</p>
				</div>
			</div>

			{/* Error Message */}
			{error && (
				<div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start justify-between">
					<p className="text-red-700">{error}</p>
					<button
						onClick={clearError}
						className="text-red-600 hover:text-red-800"
					>
						✕
					</button>
				</div>
			)}

			{/* Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
					<p className="text-sm text-gray-600">Total Tools</p>
					<p className="text-3xl font-bold text-blue-700">
						{tools.length}
					</p>
				</div>
				<div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
					<p className="text-sm text-gray-600">Configured</p>
					<p className="text-3xl font-bold text-green-700">
						{tools.filter((t) => t.configured).length}
					</p>
				</div>
				<div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg">
					<p className="text-sm text-gray-600">Pending</p>
					<p className="text-3xl font-bold text-yellow-700">
						{tools.filter((t) => !t.configured).length}
					</p>
				</div>
			</div>

			{/* Tools Grid */}
			<ToolsGrid
				tools={tools}
				loading={loading || deleting}
				onConfigure={handleConfigure}
				onDelete={handleDeleteConfig}
				searchTerm={searchTerm}
				setSearchTerm={setSearchTerm}
				selectedCategory={selectedCategory}
				setSelectedCategory={setSelectedCategory}
			/>

			{/* Configuration Modal */}
			<ToolConfigModal
				tool={selectedTool}
				isOpen={modalOpen}
				onClose={() => {
					setModalOpen(false)
					setSelectedTool(null)
					clearTestResult()
				}}
				onSave={handleSaveConfig}
				onTest={handleTestConfig}
				availableCredentials={credentials.map((c) => ({
					id: c.id,
					name: c.name,
					type: c.type,
				}))}
				loading={loading}
				testLoading={testLoading}
				testResult={testResult}
			/>
		</div>
	)
}
