import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-screen max-w-lg place-content-center gap-4 px-4 text-center">
      <h1 className="font-display text-4xl">Página não encontrada</h1>
      <p className="text-muted">O endereço não corresponde a um mapa ou a uma página publicada.</p>
      <Link href="/" className="font-semibold text-wine">
        Voltar ao início
      </Link>
    </main>
  );
}
