import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Desabilita no ambiente dev para não travar o cache do navegador
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  /* Suas outras configurações do Next.js entram aqui */
};

export default withPWA(nextConfig);