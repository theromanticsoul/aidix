export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 lg:px-10">
      <nav className="flex items-center justify-between">
        <span className="text-xl font-semibold tracking-tight">AIDIX</span>
        <a
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
          href="/login"
        >
          Войти
        </a>
      </nav>
      <section className="flex flex-1 items-center py-20">
        <div className="max-w-3xl">
          <p className="mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Дизайн комнаты по фото
          </p>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.04em] text-slate-950 sm:text-7xl">
            Увидьте, какой может стать ваша комната.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-slate-600">
            Загрузите фотографию реального пространства, выберите стиль и
            получите несколько визуальных концепций ремонта.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              className="rounded-full bg-slate-950 px-6 py-3 font-medium text-white transition hover:bg-slate-700"
              href="/login"
            >
              Попробовать бесплатно
            </a>
            <span className="text-sm text-slate-500">
              3 бесплатные генерации после входа
            </span>
          </div>
          <p className="mt-16 max-w-lg text-sm leading-6 text-slate-500">
            Визуализация создаётся ИИ и может искажать размеры, детали и
            материалы. Проверяйте реальные размеры и технические решения перед
            ремонтом или покупкой.
          </p>
        </div>
      </section>
      <footer className="border-t border-slate-200 pt-5 text-sm text-slate-500">
        AIDIX помогает сравнить направления, но не заменяет рабочий
        дизайн-проект.
      </footer>
    </main>
  );
}
