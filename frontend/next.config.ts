import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // A regra padrão do next-pwa guarda por 24 h, no aparelho, toda resposta GET de /api/*, inclusive
  // nome, e-mail e roteiros da conta, que ficariam lá depois de sair. Esta regra substitui a padrão
  // (mesmo cacheName "apis") e manda essas chamadas sempre para a rede, sem guardar nada.
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ sameOrigin, url: { pathname } }: { sameOrigin: boolean; url: URL }) =>
          sameOrigin && pathname.startsWith("/api/"),
        handler: "NetworkOnly",
        method: "GET",
        options: { cacheName: "apis" },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  // O Dockerfile.prod copia .next/standalone para a imagem final.
  output: "standalone",
  turbopack: {},
};

export default withPWA(nextConfig);