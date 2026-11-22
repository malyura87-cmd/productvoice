import ProductForm from "@/components/ProductForm";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-16">
      <header className="mb-8 text-center sm:mb-12">
        <h1 className="bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
          ProductVoice
        </h1>
        <p className="mt-3 text-base text-zinc-400 sm:text-lg">
          AI-відеоопис товару за 30 секунд
        </p>
      </header>

      <ProductForm />

      <footer className="mt-12 text-center text-xs text-zinc-500">
        Voice by{" "}
        <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="underline hover:text-zinc-300">
          ElevenLabs
        </a>
      </footer>
    </main>
  );
}
