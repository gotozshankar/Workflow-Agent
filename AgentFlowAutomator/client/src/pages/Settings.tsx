import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus,
  Upload,
  Server,
  Shield,
  Palette,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  Check,
  Play,
  Settings as SettingsIcon,
} from "lucide-react";
import { useState, useRef } from "react";
import logo from "/modern_abstract_purple_hexagon_logo_for_ai_software.png";

import { useTheme, type ThemeMode } from "@/context/ThemeContext";
import { useAppSettings } from "@/context/AppContext";

export default function Settings() {
  const { appSettings, updateAppSettings, resetAppSettings } = useAppSettings();
  const { theme, updateTheme, resetTheme } = useTheme();
  const logoInputRef = useRef<HTMLInputElement>(null);

  // MCP Servers State
  const [mcpServers, setMcpServers] = useState([
    {
      id: 1,
      name: "Filesystem",
      status: "connected",
      type: "stdio",
      command: "npx -y @modelcontextprotocol/server-filesystem",
    },
    {
      id: 2,
      name: "PostgreSQL",
      status: "disconnected",
      type: "stdio",
      command: "docker run -i --rm mcp/postgres",
    },
    {
      id: 3,
      name: "GitHub",
      status: "connected",
      type: "sse",
      url: "https://api.github.com/mcp",
    },
  ]);

  const handleAppNameChange = (newName: string) => {
    updateAppSettings({ appName: newName });
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        updateAppSettings({ appLogo: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    updateAppSettings({ appLogo: null });
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };

  const handleModeChange = (mode: ThemeMode) => {
    updateTheme({ mode });
  };

  const handleColorChange = (color: string) => {
    updateTheme({ primaryColor: color });
  };

  const handleSidebarToggle = (checked: boolean) => {
    updateTheme({ darkSidebar: checked });
  };

  const handleResetAll = () => {
    resetAppSettings();
    resetTheme();
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar />

      <main className="main-content flex-1">
        <Header title="Settings" />

        <div className="p-8 max-w-5xl mx-auto">
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="mcp">MCP Servers</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
            </TabsList>

            {/* General Settings */}
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Workspace Identity</CardTitle>
                  <CardDescription>
                    Customize how your workspace looks to team members.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Application Name</Label>
                    <Input
                      value={appSettings.appName}
                      onChange={(e) => handleAppNameChange(e.target.value)}
                      placeholder="AgentFlow"
                    />
                    <p className="text-xs text-muted-foreground">
                      This name appears in the browser title and sidebar.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Workspace Logo</Label>
                    <div className="flex items-center gap-6">
                      <div className="h-20 w-20 rounded-xl border bg-muted flex items-center justify-center overflow-hidden relative group">
                        <img
                          src={appSettings.appLogo || logo}
                          alt="Current Logo"
                          className="h-12 w-12 object-contain"
                        />
                        <div
                          onClick={() => logoInputRef.current?.click()}
                          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <Upload className="h-6 w-6 text-white" />
                        </div>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/png,image/svg+xml,image/jpeg"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => logoInputRef.current?.click()}
                          >
                            Upload New
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={handleRemoveLogo}
                            disabled={!appSettings.appLogo}
                          >
                            Remove
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Recommended size: 512x512px. PNG, JPG, or SVG.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Settings */}
            <TabsContent value="appearance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Theme Customization</CardTitle>
                  <CardDescription>
                    Manage colors and visual style.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <Label>Primary Brand Color</Label>
                      <div className="flex gap-3 items-center">
                        <div
                          className="h-10 w-10 rounded-lg border shadow-sm"
                          style={{
                            backgroundColor: theme.primaryColor,
                          }}
                        />
                        <Input
                          type="color"
                          value={theme.primaryColor}
                          onChange={(e) => handleColorChange(e.target.value)}
                          className="w-24 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={theme.primaryColor}
                          onChange={(e) => handleColorChange(e.target.value)}
                          className="font-mono uppercase"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label>Interface Mode</Label>
                      <div className="flex gap-4">
                        <div
                          onClick={() => handleModeChange("light")}
                          className={`border-2 rounded-lg p-1 cursor-pointer transition-colors ${
                            theme.mode === "light"
                              ? "border-primary"
                              : "border-muted hover:border-primary/50"
                          }`}
                        >
                          <div className="bg-white w-24 h-16 rounded-md border shadow-sm flex items-center justify-center text-xs font-medium text-slate-900">
                            Light
                          </div>
                        </div>
                        <div
                          onClick={() => handleModeChange("dark")}
                          className={`border-2 rounded-lg p-1 cursor-pointer transition-colors ${
                            theme.mode === "dark"
                              ? "border-primary"
                              : "border-muted hover:border-primary/50"
                          }`}
                        >
                          <div className="bg-slate-950 w-24 h-16 rounded-md border border-slate-800 flex items-center justify-center text-xs font-medium text-white">
                            Dark
                          </div>
                        </div>
                        <div
                          onClick={() => handleModeChange("system")}
                          className={`border-2 rounded-lg p-1 cursor-pointer transition-colors ${
                            theme.mode === "system"
                              ? "border-primary"
                              : "border-muted hover:border-primary/50"
                          }`}
                        >
                          <div className="bg-linear-to-br from-white to-slate-950 w-24 h-16 rounded-md border flex items-center justify-center text-xs font-medium">
                            System
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <Label>Sidebar Style</Label>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Use dark sidebar in light mode
                      </span>
                      <Switch
                        checked={theme.darkSidebar}
                        onCheckedChange={handleSidebarToggle}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t flex gap-2">
                    <Button onClick={resetTheme} variant="outline">
                      Reset Theme
                    </Button>
                    <Button
                      onClick={handleResetAll}
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                    >
                      Reset All Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* MCP Servers Settings */}
            <TabsContent value="mcp" className="space-y-6">
              <Card className="">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-violet-100 rounded-xl text-violet-600">
                      <Server className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        Model Context Protocol (MCP)
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Standardized protocol for connecting AI models to data
                        sources.
                      </p>
                    </div>
                  </div>
                  <Button className="text-white">Documentation</Button>
                </CardContent>
              </Card>

              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Active Servers</h3>
                <Button className="gap-2 text-white">
                  <Plus className="h-4 w-4" /> Add Server
                </Button>
              </div>

              <div className="space-y-4">
                {mcpServers.map((server) => (
                  <Card key={server.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-3 w-3 rounded-full ${server.status === "connected" ? "bg-green-500" : "bg-red-500"}`}
                          />
                          <h4 className="font-semibold">{server.name}</h4>
                          <span className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground uppercase">
                            {server.type}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon">
                            <RefreshCw className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <SettingsIcon className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="bg-muted/50 p-3 rounded-md font-mono text-xs text-muted-foreground overflow-x-auto flex items-center gap-2">
                        <span className="text-primary select-none">$</span>
                        {server.command || server.url}
                      </div>

                      <div className="mt-4 flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>Capabilities: resources, tools, prompts</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Extra Features */}
            <TabsContent value="features" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Beta Features</CardTitle>
                  <CardDescription>
                    Enable experimental capabilities.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Reactive Workflows</Label>
                      <p className="text-sm text-muted-foreground">
                        Workflows automatically adapt to new data schemas.
                      </p>
                    </div>
                    <Switch checked={true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">
                        Autonomous Agent Looping
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Allow agents to re-prompt themselves until goal is met.
                      </p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Local LLM Execution</Label>
                      <p className="text-sm text-muted-foreground">
                        Run inference on local hardware via WebGPU.
                      </p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
