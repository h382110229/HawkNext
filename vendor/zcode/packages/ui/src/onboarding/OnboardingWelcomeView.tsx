import { ArrowRightIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import { HawkNextAboutLogo } from "@/components/ui/HawkNextAboutLogo.js";
import { useHawkNextIntl } from "@/i18n/IntlProvider.js";
import { OnboardingWelcomeAsciiVisual } from "@/onboarding/OnboardingWelcomeAsciiVisual.js";

/** Wave 6: 交付向导入口 — 首屏可见 Gold CTA（HawkBrain Primary Button）。 */
export function DeliveryWizardCta(props: { onStart?: () => void }) {
  return (
    <Button
      type="button"
      id="hawk-delivery-wizard"
      size="lg"
      className="h-10 w-full justify-between text-ui-base font-bold bg-[#D6AD5C] text-[#080B0C] rounded-lg hover:brightness-110 transition-all duration-150"
      onClick={props.onStart}
    >
      <span className="inline-flex items-center gap-2">
        <SparklesIcon className="size-4" />
        交付向导 · Delivery Wizard
      </span>
      <ArrowRightIcon className="size-4" />
    </Button>
  );
}

export function OnboardingWelcomeView(props: { onStart: () => void; onOpenMigration: () => void }) {
  const { intl } = useHawkNextIntl();

  return (
    <div className="flex h-full min-h-0">
      <div className="flex w-1/2 flex-col px-8 py-8">
        <div className="space-y-6">
          <div className="inline-flex items-center rounded-full border border-border bg-background-alt px-3 py-1 text-ui-base text-foreground-subtle">
            {intl.formatMessage({ id: "onboarding.welcome.eyebrow" })}
          </div>

          <div className="space-y-2">
            {/* 欢迎 logo 壳是固定深色底，边框不能跟随浅色主题 token，否则浅色主题下边框过重。*/}
            <div
              className="relative flex size-14 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#000000_0%,#151718_100%)] text-[#ffffff] shadow-lg/20 before:pointer-events-none before:absolute before:inset-0 before:rounded-xl before:border before:border-[rgba(255,255,255,0.1)]"
              aria-label="HawkNext"
              role="img"
            >
              <HawkNextAboutLogo className="h-auto w-8" />
            </div>
            <div className="text-4xl font-bold tracking-tight text-foreground">
              {intl.formatMessage({ id: "onboarding.welcome.title" })}
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center">
          <div className="w-full space-y-4">
            {/* Wave 6: 交付向导 — 首屏主 CTA */}
            <DeliveryWizardCta onStart={props.onStart} />
            <Button
              type="button"
              size="lg"
              className="h-10 w-full justify-between text-ui-base"
              onClick={props.onStart}
            >
              {intl.formatMessage({ id: "onboarding.welcome.start" })}
              <ArrowRightIcon className="size-4" />
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="h-10 w-full justify-between text-ui-base"
              onClick={props.onOpenMigration}
            >
              {intl.formatMessage({ id: "onboarding.welcome.migrate" })}
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </div>

        <div className="pt-6 text-ui-base leading-6 text-foreground-subtle">
          {intl.formatMessage({ id: "onboarding.welcome.helper" })}
        </div>
      </div>

      <div className="flex w-1/2 flex-col p-2 pl-0">
        <OnboardingWelcomeAsciiVisual />
      </div>
    </div>
  );
}
