import type { Metadata } from "next";
import FormularioDeConta from "@/components/FormularioDeConta";

export const metadata: Metadata = { title: "Entrar | Kyr" };

export default function EntrarPage() {
  return <FormularioDeConta modo="entrar" />;
}
