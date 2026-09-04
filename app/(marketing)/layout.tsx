import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { StickyCta } from "@/components/marketing/sticky-cta";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-full flex-1 flex-col pb-16 sm:pb-14">
      <SiteHeader isLoggedIn={!!user} />
      <div className="flex-1">{children}</div>
      <SiteFooter />
      <StickyCta isLoggedIn={!!user} />
    </div>
  );
}
