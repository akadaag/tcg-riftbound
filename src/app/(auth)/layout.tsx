/**
 * Auth layout — centered, no bottom navigation.
 * Used by /login and any future auth-related pages.
 */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      {children}
    </div>
  );
}
