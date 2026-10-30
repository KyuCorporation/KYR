import type { Metadata } from "next";
import InicioClient from "./InicioClient";

export const metadata: Metadata = {
  title: "Início | Kyr",
  description: "Descubra destinos em destaque e categorias para montar seu roteiro em Foz do Iguaçu.",
};

export default function InicioPage() {
  return <InicioClient />;
}
