type AppLayoutProps = {
  children: React.ReactNode;
};

export default function CLILayout({ children }: AppLayoutProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="min-h-screen w-full">{children}</section>
    </main>
  );
}
