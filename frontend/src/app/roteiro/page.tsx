import { notFound } from "next/navigation";
import RoteiroDemoClient from "./RoteiroDemoClient";

// esta rota existe só para validar a US-09 com dados mockados. Ela não deve ficar acessível publicamente
// Depois do deploy, então bloqueamos fora de ambiente de desenvolvimento.
// Quando a integração real (US-05) estiver pronta e a lista for
// incorporada ao fluxo principal, esta rota /roteiro pode ser removida
// por completo.

export default function RoteiroDemoPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <RoteiroDemoClient />;
}