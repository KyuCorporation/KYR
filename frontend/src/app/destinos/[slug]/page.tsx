import { notFound } from "next/navigation";
import { buscarDestino } from "@/core/destinos";
import DestinoDetalheClient from "./DestinoDetalheClient";

export default async function DestinoPage({ params }: PageProps<"/destinos/[slug]">) {
  const { slug } = await params;
  const destino = buscarDestino(slug);
  if (!destino) notFound();

  return <DestinoDetalheClient destino={destino} />;
}