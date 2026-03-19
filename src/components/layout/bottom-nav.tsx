"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

// Inline SVG icons to avoid external dependency for MVP
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ShopIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2L3 7v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-3-5z" />
      <line x1="3" y1="7" x2="21" y2="7" />
      <path d="M16 11a4 4 0 0 1-8 0" />
    </svg>
  );
}

function PacksIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <path d="M12 3v18" />
      <path d="M2 12h20" />
      <circle cx="7" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="17" cy="16.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CollectionIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M9 7h6" />
      <path d="M9 11h4" />
    </svg>
  );
}

function MoreIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: <HomeIcon active={false} /> },
  { href: "/shop", label: "Shop", icon: <ShopIcon active={false} /> },
  { href: "/packs", label: "Packs", icon: <PacksIcon active={false} /> },
  {
    href: "/collection",
    label: "Collection",
    icon: <CollectionIcon active={false} />,
  },
  { href: "/more", label: "More", icon: <MoreIcon active={false} /> },
];

function NavIcon({
  item,
  active,
}: {
  item: (typeof navItems)[number];
  active: boolean;
}) {
  // Re-render the icon component with the correct active state
  switch (item.href) {
    case "/":
      return <HomeIcon active={active} />;
    case "/shop":
      return <ShopIcon active={active} />;
    case "/packs":
      return <PacksIcon active={active} />;
    case "/collection":
      return <CollectionIcon active={active} />;
    case "/more":
      return <MoreIcon active={active} />;
    default:
      return item.icon;
  }
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-nav-border bg-nav-background/95 backdrop-blur-md"
      style={{ paddingBottom: "var(--safe-area-bottom)" }}
    >
      <div className="mx-auto flex h-[var(--nav-height)] max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-1 transition-colors ${
                isActive
                  ? "text-nav-active"
                  : "text-nav-inactive active:text-nav-active/70"
              }`}
            >
              <NavIcon item={item} active={isActive} />
              <span className="text-[10px] font-medium leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
