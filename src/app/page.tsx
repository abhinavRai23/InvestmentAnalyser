import { ThemeProvider } from "@/components/theme-provider";
import { getServerPortfolioData } from "@/lib/serverData";
import { PortfolioContainer } from "@/components/PortfolioContainer";

export const dynamic = "force-dynamic";

export default function Home() {
  const data = getServerPortfolioData();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <main className="min-h-screen bg-background pb-12">
        <PortfolioContainer initialData={data} />
      </main>
    </ThemeProvider>
  );
}
