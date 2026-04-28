// Sidebar.tsx
import { Link, useLocation } from "wouter";
import { navigation } from "@/hooks/lib/mockData";
import { cn } from "@/hooks/lib/utils";
import logo from "/modern_abstract_purple_hexagon_logo_for_ai_software.png";
import {
  Settings,
  Shield,
  FileText,
  LogOut,
  ChevronUp,
  Users as UsersIcon,
  Sun,
  Moon,
  LogIn,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppSettings } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export function Sidebar() {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const { appSettings } = useAppSettings();
  const { user, logout, hasPermission } = useAuth();
  const { theme, updateTheme } = useTheme();

  const isLoggedIn = !!user;

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error: any) {
      toast({
        title: "Logout issue",
        description:
          error.message ||
          "Something went wrong, but you have been logged out locally.",
        variant: "destructive",
      });
    }
    navigate("/login");
  };

  const toggleDark = () => {
    updateTheme({ mode: theme.mode === "dark" ? "light" : "dark" });
  };

  const initials =
    user?.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() || "U";

  const isDark = theme.mode === "dark";

  return (
    <>
      <div className="sidebar-wrapper group">
        <div className="sidebar-inner h-screen flex flex-col bg-sidebar border-r border-sidebar-border rounded-r-2xl overflow-hidden">
          {/* Logo – fixed width column to prevent shrinking */}
          <div className="flex items-center py-5 flex-shrink-0">
            <div className="sidebar-icon-col">
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #B494F0, #FF9FCE)",
                }}
              >
                <img
                  src={appSettings.appLogo || logo}
                  alt="logo"
                  className="h-5 w-5 object-contain brightness-200"
                />
              </div>
            </div>
            <span
              className="sidebar-label font-bold text-sm tracking-tight text-sidebar-foreground pr-2"
              style={{ fontFamily: "Playfair Display, serif" }}
            >
              {appSettings.appName}
            </span>
          </div>

          {/* Navigation – only visible when logged in */}
          {isLoggedIn && (
            <div className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto min-h-0">
              <p className="sidebar-label px-2 text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 mt-1 overflow-hidden whitespace-nowrap">
                Workspace
              </p>
              {navigation.map((item, i) => {
                const isActive = location === item.path;
                const pastelBg = [
                  "hover:bg-[#EDE8F5]",
                  "hover:bg-[#FDEEE8]",
                  "hover:bg-[#E8F5EE]",
                  "hover:bg-[#E8F0FD]",
                  "hover:bg-[#FDE8F0]",
                  "hover:bg-[#FDF6E8]",
                ];
                const activeBg = [
                  "bg-[#EDE8F5]",
                  "bg-[#FDEEE8]",
                  "bg-[#E8F5EE]",
                  "bg-[#E8F0FD]",
                  "bg-[#FDE8F0]",
                  "bg-[#FDF6E8]",
                ];
                const iconColors = [
                  "#9B7FD4",
                  "#E8956D",
                  "#6DB89B",
                  "#6D9BE8",
                  "#E86D9B",
                  "#C4A24A",
                ];
                const idx = i % 6;
                return (
                  <Link
                    key={item.name}
                    href={item.path}
                    className={cn(
                      "flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 hover:text-black",
                      isActive
                        ? `${activeBg[idx]} text-[${iconColors[idx]}]`
                        : `text-sidebar-foreground ${pastelBg[idx]}`,
                    )}
                    title={item.name}
                  >
                    <item.icon
                      className="h-4 w-4 flex-shrink-0"
                      style={{ color: iconColors[idx] }}
                    />
                    <span className="sidebar-label whitespace-nowrap overflow-hidden">
                      {item.name}
                    </span>
                  </Link>
                );
              })}

              <p className="sidebar-label px-2 text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 mt-4 overflow-hidden whitespace-nowrap">
                Models
              </p>
              {[
                { href: "/models", label: "LLM Models" },
                /* { href: "/custom-models", label: "Custom Models" }, */
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all  hover:text-black",
                    location === href
                      ? "bg-[#E8F5EE] text-[#6DB89B]"
                      : "text-sidebar-foreground hover:bg-[#E8F5EE]",
                  )}
                  title={label}
                >
                  <Settings
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: "#6DB89B" }}
                  />
                  <span className="sidebar-label whitespace-nowrap overflow-hidden">
                    {label}
                  </span>
                </Link>
              ))}

              <p className="sidebar-label px-2 text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 mt-4 overflow-hidden whitespace-nowrap">
                Compliance
              </p>
              {hasPermission("security:view") && (
                <Link
                  href="/security"
                  className={cn(
                    "flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all  hover:text-black",
                    location === "/security"
                      ? "bg-[#FDE8F0] text-[#E86D9B]"
                      : "text-sidebar-foreground hover:bg-[#FDE8F0]",
                  )}
                  title="Security"
                >
                  <Shield
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: "#E86D9B" }}
                  />
                  <span className="sidebar-label whitespace-nowrap overflow-hidden">
                    Security
                  </span>
                </Link>
              )}
              {hasPermission("audit:view") && (
                <Link
                  href="/audit"
                  className={cn(
                    "flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all  hover:text-black",
                    location === "/audit"
                      ? "bg-[#E8F0FD] text-[#6D9BE8]"
                      : "text-sidebar-foreground hover:bg-[#E8F0FD]",
                  )}
                  title="Audit Logs"
                >
                  <FileText
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: "#6D9BE8" }}
                  />
                  <span className="sidebar-label whitespace-nowrap overflow-hidden">
                    Audit Logs
                  </span>
                </Link>
              )}

              <p className="sidebar-label px-2 text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 mt-4 overflow-hidden whitespace-nowrap">
                Configuration
              </p>
              {hasPermission("settings:view") && (
                <Link
                  href="/settings"
                  className={cn(
                    "flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all hover:text-black",
                    location === "/settings"
                      ? "bg-[#FDF6E8] text-[#C4A24A]"
                      : "text-sidebar-foreground hover:bg-[#FDF6E8]",
                  )}
                  title="Settings & MCP"
                >
                  <Settings
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: "#C4A24A" }}
                  />
                  <span className="sidebar-label whitespace-nowrap overflow-hidden">
                    Settings & MCP
                  </span>
                </Link>
              )}
              {hasPermission("users:view") && (
                <Link
                  href="/users"
                  className={cn(
                    "flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all hover:text-black",
                    location === "/users"
                      ? "bg-[#EDE8F5] text-[#9B7FD4]"
                      : "text-sidebar-foreground hover:bg-[#EDE8F5]",
                  )}
                  title="Users"
                >
                  <UsersIcon
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: "#9B7FD4" }}
                  />
                  <span className="sidebar-label whitespace-nowrap overflow-hidden">
                    Users
                  </span>
                </Link>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="px-2 pb-4 pt-2 border-t border-sidebar-border flex-shrink-0">
            {/* <button
              onClick={toggleDark}
              className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-semibold text-sidebar-foreground hover:bg-sidebar-accent transition-all mb-2"
              title={isDark ? "Light Mode" : "Dark Mode"}
            >
              {isDark ? (
                <Sun className="h-4 w-4 flex-shrink-0 text-[#C4A24A]" />
              ) : (
                <Moon className="h-4 w-4 flex-shrink-0 text-[#9B7FD4]" />
              )}
              <span className="sidebar-label whitespace-nowrap overflow-hidden">
                {isDark ? "Light Mode" : "Dark Mode"}
              </span>
            </button> */}

            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-sidebar-accent cursor-pointer transition-all">
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      <AvatarImage src="https://github.com/shadcn.png" />
                      <AvatarFallback
                        className="text-xs"
                        style={{
                          background: "linear-gradient(135deg,#E8DEFF,#FFDAEE)",
                          color: "#9B7FD4",
                        }}
                      >
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="sidebar-label flex-1 min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold text-sidebar-foreground truncate">
                        {user?.name || "User"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate capitalize">
                        {user?.role || "user"}
                      </p>
                    </div>
                    <ChevronUp className="sidebar-label h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  </div>
                </DropdownMenuTrigger>

                <DropdownMenuPrimitive.Portal>
                  <DropdownMenuContent
                    side="top"
                    align="end"
                    sideOffset={8}
                    className="w-56 rounded-xl border shadow-xl p-1"
                    style={{
                      zIndex: 99999,
                      background: "rgba(255,255,255,0.95)",
                      backdropFilter: "blur(16px)",
                      borderColor: "rgba(155,127,212,0.2)",
                    }}
                  >
                    <div className="px-3 py-2 ">
                      <p className="font-semibold text-sm text-black">
                        {user?.name || "User"}
                      </p>
                      <p className="text-xs text-muted-foreground  text-black">
                        {user?.email || "user@example.com"}
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    {hasPermission("settings:view") && (
                      <DropdownMenuItem asChild>
                        <Link
                          href="/settings"
                          className="cursor-pointer rounded-lg text-black"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Settings & MCP
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {hasPermission("users:view") && (
                      <DropdownMenuItem asChild>
                        <Link
                          href="/users"
                          className="cursor-pointer rounded-lg text-black"
                        >
                          <UsersIcon className="h-4 w-4 mr-2" />
                          Manage Users
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-rose-500 focus:text-rose-500 focus:bg-rose-50 cursor-pointer rounded-lg"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenuPrimitive.Portal>
              </DropdownMenu>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-semibold text-sidebar-foreground hover:bg-sidebar-accent transition-all"
                title="Sign In"
              >
                <LogIn className="h-4 w-4 flex-shrink-0 text-[#9B7FD4]" />
                <span className="sidebar-label whitespace-nowrap overflow-hidden">
                  Sign In
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
