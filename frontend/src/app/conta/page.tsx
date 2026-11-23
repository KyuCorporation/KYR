import type { Metadata } from "next";
import ContaClient from "./ContaClient";

export const metadata: Metadata = {
  title: "Minha conta | Kyr",
  description: "Baixe, corrija ou apague os seus dados no Kyr.",
};

export default function ContaPage() {
  return <ContaClient />;
}
