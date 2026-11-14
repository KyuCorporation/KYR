import type { Metadata } from "next";
import FormularioDeConta from "@/components/FormularioDeConta";

export const metadata: Metadata = { title: "Criar conta | Kyr" };

export default function CadastroPage() {
  return <FormularioDeConta modo="cadastro" />;
}
