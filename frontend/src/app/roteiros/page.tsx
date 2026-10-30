import type { Metadata } from "next";
import RoteirosClient from "./RoteirosClient";

export const metadata: Metadata = {
  title: "Meus roteiros | Kyr",
  description: "Veja e gerencie os roteiros que você salvou no Kyr.",
};

export default function RoteirosPage() {
  return <RoteirosClient />;
}
