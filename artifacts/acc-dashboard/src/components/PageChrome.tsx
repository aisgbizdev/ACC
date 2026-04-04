import type { ReactNode } from "react";

export function PageChrome({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[32px] border border-white/6 bg-[#060d19] p-6 shadow-[0_40px_100px_rgba(0,0,0,0.35)] md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              {eyebrow && (
                <p className="mb-3 text-xs uppercase tracking-[0.24em] text-slate-500">{eyebrow}</p>
              )}
              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">{title}</h1>
              {description && <p className="mt-3 max-w-3xl text-sm text-slate-400 md:text-base">{description}</p>}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        </section>
        {children}
      </div>
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[28px] border border-white/8 bg-[#0b1525] shadow-[0_30px_80px_rgba(0,0,0,0.28)] ${className}`}>
      {children}
    </div>
  );
}
