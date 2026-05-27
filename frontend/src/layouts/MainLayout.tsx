import { useState, useMemo, type ReactNode } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

interface NavItem {
  to: string;
  label: string;
  icon: (props: { className?: string }) => ReactNode;
  adminOnly?: boolean;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [];

const ALUMNO_NAV_ITEMS: NavItem[] = [
  { to: "/alumno/dashboard", label: "Mi Panel", icon: DashboardIcon, section: "alumno" },
  { to: "/alumno/clases", label: "Mis Clases", icon: CalendarIcon, section: "alumno" },
  { to: "/alumno/planes", label: "Planes", icon: PlanIcon, section: "alumno" },
  { to: "/alumno/rutinas", label: "Mi Rutina", icon: ClipboardDocIcon, section: "alumno" },
  { to: "/alumno/perfil", label: "Mi Perfil", icon: UserProfileIcon, section: "alumno" },
];

const PROFESOR_NAV_ITEMS: NavItem[] = [
  { to: "/profesor/dashboard", label: "Mi Panel", icon: DashboardIcon, section: "profesor" },
  { to: "/profesor/turnos", label: "Mis Clases", icon: CalendarIcon, section: "profesor" },
  { to: "/profesor/asistencia", label: "Asistencia", icon: CheckCircleIcon, section: "profesor" },
  { to: "/profesor/evaluaciones", label: "Evaluaciones", icon: ClipboardDocIcon, section: "profesor" },
  { to: "/profesor/rutinas", label: "Rutinas", icon: ClipboardDocIcon, section: "profesor" },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: "/admin/dashboard", label: "Mi Panel", icon: DashboardIcon, adminOnly: true, section: "admin" },
  { to: "/admin/usuarios", label: "Usuarios", icon: AdminUsersIcon, adminOnly: true, section: "admin" },
  { to: "/admin/actividades", label: "Actividades", icon: ActivityIcon, adminOnly: true, section: "admin" },
  { to: "/admin/turnos", label: "Turnos", icon: CalendarIcon, adminOnly: true, section: "admin" },
  { to: "/admin/planes", label: "Planes", icon: PlanIcon, adminOnly: true, section: "admin" },
  { to: "/admin/rutinas", label: "Rutinas", icon: ClipboardDocIcon, adminOnly: true, section: "admin" },
];

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const initials = user
    ? `${user.nombre[0]}${user.apellido[0]}`.toUpperCase()
    : "";
  const displayName = user ? `${user.nombre} ${user.apellido}` : "";
  const rolLabel: Record<string, string> = {
    admin: "Administrador",
    profesor: "Profesor",
    recepcionista: "Recepcionista",
    alumno: "Alumno",
  };

  const isAdmin = user?.rol === "admin";
  const isProfesor = user?.rol === "profesor";
  const isAlumno = user?.rol === "alumno";
  const navItems = useMemo(() => {
    const items = [...NAV_ITEMS];
    if (isAlumno) items.push(...ALUMNO_NAV_ITEMS);
    if (isProfesor) items.push(...PROFESOR_NAV_ITEMS);
    if (isAdmin) items.push(...ADMIN_NAV_ITEMS);
    return items;
  }, [isAdmin, isProfesor, isAlumno]);

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-900">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          style={{ animation: "fade-in 200ms ease-out" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col bg-sidebar
          transition-all duration-200 ease-in-out
          lg:static lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          ${collapsed ? "lg:w-[4.5rem]" : "lg:w-64"}
          w-64
        `}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 px-6 shrink-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-500">
            <span className="text-sm font-bold text-white">H</span>
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold tracking-tight text-white whitespace-nowrap">
              HSP-70
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="mt-4 flex-1 space-y-1 px-3 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, section }, idx) => {
            const prevSection = idx > 0 ? navItems[idx - 1]?.section : undefined;
            const isNewSection = section && section !== prevSection;
            const sectionLabels: Record<string, string> = {
              alumno: "Mi espacio",
              profesor: "Profesor",
              admin: "Administración",
            };

            return (
            <div key={to}>
              {isNewSection && (
                <div className={`my-3 ${collapsed ? "mx-2" : "mx-1"}`}>
                  <div className="border-t border-white/10" />
                  {!collapsed && (
                    <p className="mt-3 mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                      {sectionLabels[section] ?? section}
                    </p>
                  )}
                </div>
              )}
              <NavLink
                to={to}
                end={to === "/"}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                  transition-colors duration-150
                  ${collapsed ? "lg:justify-center lg:px-0" : ""}
                  ${
                    isActive
                      ? "bg-sidebar-active text-white"
                      : "text-neutral-300 hover:bg-sidebar-hover hover:text-white"
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{label}</span>}
                {collapsed && (
                  <span className="hidden">{label}</span>
                )}
              </NavLink>
            </div>
          );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-white/10 p-3 shrink-0">
          <div
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
              collapsed ? "lg:justify-center lg:px-0" : ""
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
              {initials}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {displayName}
                </p>
                <p className="text-xs text-neutral-400 truncate">
                  {user ? rolLabel[user.rol] ?? user.rol : ""}
                </p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              type="button"
              onClick={handleLogout}
              className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-400 transition-colors duration-150 hover:bg-sidebar-hover hover:text-white"
            >
              <LogoutIcon className="h-4 w-4 shrink-0" />
              Cerrar sesión
            </button>
          )}
          {collapsed && (
            <button
              type="button"
              title="Cerrar sesión"
              onClick={handleLogout}
              className="mt-1 flex w-full items-center justify-center rounded-lg py-2 text-neutral-400 transition-colors duration-150 hover:bg-sidebar-hover hover:text-white"
            >
              <LogoutIcon className="h-4 w-4 shrink-0" />
            </button>
          )}
        </div>

        {/* Version */}
        {!collapsed && (
          <div className="px-6 py-3 shrink-0">
            <p className="text-xs text-neutral-500">v0.1.0</p>
          </div>
        )}
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-neutral-800 bg-neutral-900 px-4 lg:px-8">
          {/* Mobile menu toggle */}
          <button
            type="button"
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <MenuIcon className="h-5 w-5" />
          </button>

          {/* Desktop sidebar collapse toggle */}
          <button
            type="button"
            className="hidden lg:flex rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors duration-150"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            <CollapseIcon className={`h-5 w-5 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`} />
          </button>

          <div className="flex-1" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-neutral-900 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* Inline SVG icons — small, no external dependency */

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function CollapseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
    </svg>
  );
}

function AdminUsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

function PlanIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function ClipboardDocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    </svg>
  );
}

function UserProfileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}
