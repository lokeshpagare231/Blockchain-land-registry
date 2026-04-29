import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

const mainLinks = [
  { href: "/", label: "Dashboard Overview" },
  { href: "/property-registry", label: "Register Property" },
  { href: "/property-transactions", label: "Property Transactions" },
  { href: "/property-search", label: "Property Search" },
  { href: "/ai-verification", label: "AI Verification" },
  { href: "/security-monitoring", label: "Security Monitoring" }
];

const advancedLinks = [
  { href: "/blockchain-explorer", label: "Blockchain Explorer" },
  { href: "/blockchain-simulator", label: "Blockchain Simulator" },
  { href: "/network-status", label: "Network Status" },
  { href: "/crosschain-bridge", label: "Cross-Chain Bridge" }
];

function NavItem({ href, label, active, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block rounded-xl px-3 py-2 text-sm transition ${
        active
          ? "bg-emerald-400/20 text-emerald-300"
          : "text-slate-300 hover:bg-slate-800/70 hover:text-slate-100"
      }`}
    >
      {label}
    </Link>
  );
}

export default function Layout({ title, subtitle, children, helpText }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <div className="md:hidden">
        <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-100">Land Registry</p>
            <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setMobileOpen((v) => !v)}>
              {mobileOpen ? "Close Menu" : "Menu"}
            </button>
          </div>
        </header>
        {mobileOpen ? (
          <div className="border-b border-slate-800 bg-slate-950/95 px-3 pb-4 pt-2">
            <p className="px-3 pb-2 pt-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">Main</p>
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
            <p className="px-3 pb-2 pt-4 text-[11px] uppercase tracking-[0.2em] text-slate-500">Advanced</p>
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
          </div>
        ) : null}
      </div>

      <div className="mx-auto flex max-w-[1600px]">
        <aside className="hidden h-screen w-72 flex-shrink-0 border-r border-slate-800/70 bg-slate-950/80 p-5 md:sticky md:top-0 md:block">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">National Ledger</p>
            <h2 className="mt-2 text-lg font-bold text-slate-100">Land Registry Portal</h2>
            <p className="mt-2 text-xs text-slate-400">Property records, document checks, and fraud monitoring in one place.</p>
          </div>

          <nav className="mt-6 space-y-1">
            <p className="px-3 pb-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">Main</p>
            {mainLinks.map((item) => (
              <NavItem key={item.href} href={item.href} label={item.label} active={router.pathname === item.href} />
            ))}
          </nav>

          <nav className="mt-6 space-y-1">
            <p className="px-3 pb-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">Advanced</p>
            {advancedLinks.map((item) => (
              <NavItem key={item.href} href={item.href} label={item.label} active={router.pathname === item.href} />
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-8 pt-4 md:px-8 md:pt-8">
          <section className="panel animate-fade-up p-5 md:p-7">
            <h1 className="text-2xl font-bold text-slate-100 md:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-2 max-w-3xl text-sm text-slate-300">{subtitle}</p> : null}
            {helpText ? <p className="mt-3 rounded-xl bg-slate-800/70 px-3 py-2 text-xs text-slate-300">{helpText}</p> : null}
          </section>

          <div className="mt-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
