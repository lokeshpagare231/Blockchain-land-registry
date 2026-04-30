import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const allMainLinks = [
  { href: "/", label: "Dashboard Overview", roles: ["Registrar", "Government Official", "Landowner"] },
  { href: "/property-registry", label: "Register Property", roles: ["Registrar"] },
  { href: "/property-transactions", label: "Property Transactions", roles: ["Registrar", "Landowner"] },
  { href: "/property-search", label: "Property Search", roles: ["Registrar", "Government Official", "Landowner"] },
  { href: "/ai-verification", label: "AI Verification", roles: ["Registrar", "Landowner", "Government Official"] },
  { href: "/security-monitoring", label: "Security Monitoring", roles: ["Government Official"] }
];

const allAdvancedLinks = [
  { href: "/blockchain-explorer", label: "Blockchain Explorer", roles: ["Government Official", "Registrar", "Landowner"] },
  { href: "/blockchain-simulator", label: "Blockchain Simulator", roles: ["Registrar"] },
  { href: "/network-status", label: "Network Status", roles: ["Government Official", "Registrar"] },
  { href: "/crosschain-bridge", label: "Cross-Chain Bridge", roles: ["Registrar", "Landowner", "Government Official"] }
];

function NavItem({ href, label, active, onClick, collapsed }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : ""}
      className={`flex items-center rounded-[14px] px-4 py-2.5 text-sm font-bold transition-all ${
        active
          ? "bg-indigo-500/20 text-indigo-300 shadow-sm border border-indigo-500/30"
          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
      }`}
    >
      <span className="truncate">{collapsed ? label.charAt(0) : label}</span>
    </Link>
  );
}

export default function Layout({ title, subtitle, children, helpText }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { account, role, isAuthenticating, login, logout, authError } = useAuth();

  if (!account) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-slate-200 flex flex-col items-center justify-center p-4 overflow-hidden relative">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 blur-3xl rounded-full"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 blur-3xl rounded-full"></div>
        
        <div className="panel p-8 max-w-md w-full border border-slate-700 bg-slate-900/80 backdrop-blur-md relative z-10 text-center shadow-2xl rounded-3xl">
          <div className="h-16 w-16 mx-auto bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-6">
            <span className="text-3xl font-black text-white">B</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-2">Blockguard Registry</h1>
          <p className="text-slate-400 font-bold mb-8">Wallet-based access control.</p>
          
          <button 
            onClick={login} 
            disabled={isAuthenticating}
            className="w-full btn-primary py-4 font-black flex items-center justify-center gap-2 text-lg shadow-lg hover:shadow-indigo-500/25 transition-all"
          >
            {isAuthenticating ? "Connecting & Signing..." : "Connect MetaMask"}
          </button>
          
          {authError && <p className="mt-4 text-sm font-bold text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 text-left">{authError}</p>}
        </div>
      </div>
    );
  }

  const mainLinks = allMainLinks.filter(item => !item.roles || item.roles.includes(role));
  const advancedLinks = allAdvancedLinks.filter(item => !item.roles || item.roles.includes(role));

  return (
    <div className="min-h-screen text-slate-200 bg-transparent">
      <div className="md:hidden">
        <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/90 px-4 py-3 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-indigo-600 shadow-sm flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">B</span>
              </div>
              <p className="text-sm font-extrabold text-slate-100">Blockguard Registry</p>
            </div>
            <button type="button" className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300" onClick={() => setMobileOpen((v) => !v)}>
              {mobileOpen ? "Close" : "Menu"}
            </button>
          </div>
        </header>
        {mobileOpen ? (
          <div className="border-b border-slate-800 bg-slate-900/95 px-3 pb-4 pt-2 backdrop-blur-xl absolute w-full z-30 shadow-lg">
            <p className="px-4 pb-2 pt-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Main</p>
            <div className="space-y-1">
              {mainLinks.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  active={router.pathname === item.href}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </div>
            {advancedLinks.length > 0 && (
              <>
                <p className="px-4 pb-2 pt-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Advanced</p>
                <div className="space-y-1">
                  {advancedLinks.map((item) => (
                    <NavItem
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      active={router.pathname === item.href}
                      onClick={() => setMobileOpen(false)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      <div className="mx-auto flex max-w-[1600px]">
        <aside className={`hidden h-screen flex-shrink-0 border-r border-slate-800/60 bg-slate-900/40 backdrop-blur-xl p-4 md:sticky md:top-0 md:flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-20 items-center' : 'w-72'}`}>
          <div className={`flex items-center gap-3 px-2 mb-8 ${sidebarCollapsed ? 'justify-center w-full' : ''}`}>
            <div className="h-10 w-10 flex-shrink-0 rounded-[12px] bg-indigo-600 shadow-md flex items-center justify-center">
              <span className="text-lg font-extrabold text-white">B</span>
            </div>
            {!sidebarCollapsed && (
              <h2 className="text-xl font-black text-slate-100 tracking-tight leading-tight">Blockguard<br/><span className="text-sm text-slate-400">Land Registry</span></h2>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar w-full">
            <nav className="space-y-1.5 w-full">
              {!sidebarCollapsed && <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Dashboard</p>}
              {mainLinks.map((item) => (
                <NavItem key={item.href} href={item.href} label={item.label} active={router.pathname === item.href} collapsed={sidebarCollapsed} />
              ))}
            </nav>

            {advancedLinks.length > 0 && (
              <nav className="mt-8 space-y-1.5 w-full">
                {!sidebarCollapsed && <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Advanced</p>}
                {advancedLinks.map((item) => (
                  <NavItem key={item.href} href={item.href} label={item.label} active={router.pathname === item.href} collapsed={sidebarCollapsed} />
                ))}
              </nav>
            )}
          </div>

          {!sidebarCollapsed && (
            <div className="mt-4 pt-4 border-t border-slate-800/60 w-full">
              <div className="p-3 text-center rounded-[16px] bg-slate-900/60 border border-slate-800">
                <p className="text-sm font-extrabold text-slate-100">{role}</p>
                <p className="text-xs font-mono text-emerald-400 mt-1 truncate px-2" title={account}>{account.slice(0, 6)}...{account.slice(-4)}</p>
              </div>
            </div>
          )}
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-12 pt-4 md:px-10 md:pt-8 flex flex-col min-h-screen">
          <header className="hidden md:flex justify-between items-center mb-8 bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-[20px] p-3 pl-4 pr-4 shadow-sm">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="h-10 w-10 rounded-xl hover:bg-slate-800 text-slate-400 flex items-center justify-center transition-colors"
                title="Toggle Sidebar"
              >
                ☰
              </button>
              <div className="relative w-64">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">🔍</span>
                <input type="text" placeholder="Search..." className="pl-10 py-2 bg-slate-900/60 border-slate-700 text-sm font-bold text-slate-200 rounded-xl w-full placeholder-slate-500" />
              </div>
            </div>
            <div className="flex items-center gap-4 ml-6">
              <button className="h-10 w-10 rounded-full bg-slate-900/60 border border-slate-700 shadow-sm flex items-center justify-center text-slate-400 hover:bg-slate-800 transition-colors font-bold">
                🔔
              </button>
              <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-xl py-1.5 px-3">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-bold text-slate-300">{role}</span>
              </div>
              <button onClick={logout} className="rounded-xl border border-rose-500/30 text-rose-400 font-bold py-1.5 px-4 hover:bg-rose-500/10 transition-colors shadow-sm text-sm">
                Disconnect
              </button>
            </div>
          </header>

          <section className="mb-8">
            <h1 className="text-3xl font-black text-slate-100 tracking-tight">{title}</h1>
            {subtitle ? <p className="mt-2 max-w-2xl text-[15px] font-bold text-slate-400 leading-relaxed">{subtitle}</p> : null}
            {helpText ? <p className="mt-4 rounded-[12px] border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm font-bold text-indigo-300 flex items-start gap-3"><span>💡</span> <span>{helpText}</span></p> : null}
          </section>

          <div className="flex-1">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
