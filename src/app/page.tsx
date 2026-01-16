import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SignInButton } from '@/components/SignInButton';
import { LandingVisual } from '@/components/LandingVisual';

export default async function LandingPage() {
  const session = await auth();

  if (session?.accessToken) {
    redirect('/inbox');
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-slate-100 overflow-x-hidden">
      {/* Background pattern */}
      <div
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* ===== MOBILE LAYOUT (show on small screens) ===== */}
      <main className="lg:hidden relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-8 gap-0">

        {/* Headline - compact for mobile */}
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-slate-900 leading-tight tracking-tight mb-2">
          Resolva seu dia
          <br />
          em{' '}
          <span className="relative inline-block">
            <span className="text-blue-600">minutos</span>
            <span className="absolute bottom-0 left-0 right-0 h-1.5 bg-blue-600/15 -rotate-1 -z-10 rounded-sm" />
          </span>
          .
        </h1>

        {/* Visual - smaller for mobile */}
        <div className="scale-[0.55] sm:scale-[0.65] origin-center -my-12 sm:-my-10">
          <LandingVisual />
        </div>

        {/* CTA Button */}
        <div className="flex flex-col items-center gap-2 w-full max-w-xs">
          <SignInButton />
          <p className="text-xs text-slate-400 text-center">
            Conexão segura com Google
          </p>
        </div>
      </main>

      {/* ===== DESKTOP LAYOUT (show on large screens) ===== */}
      <main className="hidden lg:flex relative z-10 min-h-screen items-center">
        <div className="w-full max-w-6xl mx-auto px-12 py-16">

          {/* Two column grid */}
          <div className="grid grid-cols-2 gap-12 items-center">

            {/* Column 1: Text content */}
            <div className="text-left">

              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-sm font-semibold text-blue-600 mb-8 shadow-sm border border-slate-200">
                <span>✨</span>
                <span>Novo Jeito de Usar Email</span>
              </div>

              {/* Headline */}
              <h1 className="text-5xl xl:text-6xl font-bold leading-[1.1] text-slate-900 mb-6 tracking-tight">
                Resolva seu dia
                <br />
                em{' '}
                <span className="relative inline-block">
                  <span className="text-blue-600">minutos</span>
                  <span className="absolute bottom-1 left-0 right-0 h-3 bg-blue-600/15 -rotate-1 -z-10 rounded-sm" />
                </span>
                .
              </h1>

              {/* Subheadline */}
              <p className="text-lg text-slate-500 leading-relaxed mb-10 max-w-lg">
                Seus e-mails viram cards. Arraste para limpar, toque para ler.
                IA que resume e organiza tudo para você focar no que importa.
              </p>

              {/* CTA */}
              <div className="flex flex-col gap-4 mb-12 items-start">
                <SignInButton />
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span>Conexão segura com Google • Cancele quando quiser</span>
                </div>
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-3 pt-8 border-t border-slate-200">
                {[
                  { icon: '⚡', label: 'Zero bagunça' },
                  { icon: '🧠', label: 'Resumos IA' },
                  { icon: '🎯', label: 'Foco total' },
                ].map((feature) => (
                  <div
                    key={feature.label}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white rounded-full text-sm font-semibold text-slate-600 shadow-sm border border-slate-100"
                  >
                    <span>{feature.icon}</span>
                    <span>{feature.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Visual demo */}
            <div className="flex justify-end">
              <LandingVisual />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
