export interface Destino {
  slug: string;
  nome: string;
  cidade: string;
  estado: string;
  categoria: string;
  tags: string[];
  endereco: string;
  coordenadas: { latitude: number; longitude: number };
  imagem: string;
  imagemAlt: string;
  credito: string;
  creditoUrl: string;
  licenca: string;
  licencaUrl: string;
  resumo: string;
  descricao: string;
  tempoVisita: string;
  melhorEpoca: string;
}

export const DESTINOS: Destino[] = [
  {
    slug: "cataratas-do-iguacu",
    nome: "Cataratas do Iguaçu",
    cidade: "Foz do Iguaçu",
    estado: "Paraná",
    categoria: "Natureza",
    tags: ["Ecoturismo", "Aventura"],
    endereco: "Rodovia das Cataratas, BR-469, Parque Nacional do Iguaçu",
    coordenadas: { latitude: -25.693905, longitude: -54.4365376 },
    imagem: "/destinos/cataratas.jpg",
    imagemAlt: "Vista aérea das quedas e da mata do Parque Nacional do Iguaçu",
    credito: "Mariordo (Mario Roberto Durán Ortiz), CC BY-SA 4.0",
    creditoUrl: "https://commons.wikimedia.org/wiki/File:Aerial_Foz_de_Igua%C3%A7u_26_Nov_2005.jpg",
    licenca: "CC BY-SA 4.0",
    licencaUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    resumo: "Trilhas e mirantes revelam um dos maiores conjuntos de quedas-d'água do mundo.",
    descricao: "O Parque Nacional do Iguaçu combina passarelas, mirantes e trilhas em meio à Mata Atlântica. É uma parada de natureza e contemplação no extremo oeste do Paraná.",
    tempoVisita: "Aproximadamente 2 horas",
    melhorEpoca: "Março a maio",
  },
  {
    slug: "parque-das-aves",
    nome: "Parque das Aves",
    cidade: "Foz do Iguaçu",
    estado: "Paraná",
    categoria: "Natureza",
    tags: ["Ecoturismo", "Vida selvagem"],
    endereco: "Av. das Cataratas, 12450, Parque Nacional",
    coordenadas: { latitude: -25.6150914, longitude: -54.4841325 },
    imagem: "/destinos/parque-das-aves.jpg",
    imagemAlt: "Tucano em viveiro de Mata Atlântica no Parque das Aves",
    credito: "Parque das Aves, CC BY-SA 4.0",
    creditoUrl: "https://commons.wikimedia.org/wiki/File:Viveiro_Aves_de_Rios_e_Mangues.jpg",
    licenca: "CC BY-SA 4.0",
    licencaUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    resumo: "Um percurso imersivo de conservação e contato com aves da Mata Atlântica.",
    descricao: "Viveiros de imersão e trilhas apresentam aves resgatadas e espécies da Mata Atlântica. O parque fica próximo à entrada do Parque Nacional do Iguaçu.",
    tempoVisita: "Aproximadamente 2 horas",
    melhorEpoca: "Durante todo o ano",
  },
  {
    slug: "marco-das-tres-fronteiras",
    nome: "Marco das Três Fronteiras",
    cidade: "Foz do Iguaçu",
    estado: "Paraná",
    categoria: "Cultura",
    tags: ["História", "Pôr do sol"],
    endereco: "Av. Gen. Meira, s/n, Jardim Eldorado",
    coordenadas: { latitude: -25.5901531, longitude: -54.5902488 },
    imagem: "/destinos/marco-tres-fronteiras.jpg",
    imagemAlt: "Encontro dos rios Paraná e Iguaçu na região da Tríplice Fronteira",
    credito: "Dalton Scavassa, CC BY-SA 4.0",
    creditoUrl: "https://commons.wikimedia.org/wiki/File:Foz_do_Rio_Igua%C3%A7u.jpg",
    licenca: "CC BY-SA 4.0",
    licencaUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    resumo: "Um encontro de rios, culturas e paisagens entre Brasil, Argentina e Paraguai.",
    descricao: "O marco brasileiro fica na confluência dos rios Iguaçu e Paraná. Do complexo cultural, é possível observar os marcos dos três países e o encontro das fronteiras.",
    tempoVisita: "Aproximadamente 1 hora",
    melhorEpoca: "Fim da tarde",
  },
  {
    slug: "itaipu-binacional",
    nome: "Itaipu Binacional",
    cidade: "Foz do Iguaçu",
    estado: "Paraná",
    categoria: "Engenharia",
    tags: ["Tecnologia", "Natureza"],
    endereco: "Av. Tancredo Neves, 6702",
    coordenadas: { latitude: -25.4095768, longitude: -54.5844935 },
    imagem: "/destinos/itaipu.jpg",
    imagemAlt: "Vista aérea da barragem e do vertedouro da Usina de Itaipu",
    credito: "Angelo Leithold, CC BY-SA 3.0",
    creditoUrl: "https://commons.wikimedia.org/wiki/File:ItaipuAerea2AAL.jpg",
    licenca: "CC BY-SA 3.0",
    licencaUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    resumo: "Uma visita à escala monumental de uma das maiores usinas hidrelétricas do planeta.",
    descricao: "A usina binacional oferece diferentes circuitos de visitação. A programação e a operação do vertedouro variam, então vale conferir as condições antes de sair.",
    tempoVisita: "Varia conforme o circuito",
    melhorEpoca: "Durante todo o ano",
  },
  {
    slug: "templo-budista-chen-tien",
    nome: "Templo Budista Chen Tien",
    cidade: "Foz do Iguaçu",
    estado: "Paraná",
    categoria: "Cultura",
    tags: ["Arquitetura", "Contemplação"],
    endereco: "Rua Dr. Josivalter Vilanova, 99, Porto Belo",
    coordenadas: { latitude: -25.4749664, longitude: -54.5989281 },
    imagem: "/destinos/templo-budista.jpg",
    imagemAlt: "Entrada do Templo Budista Chen Tien em Foz do Iguaçu",
    credito: "Jonas de Carvalho, CC BY-SA 2.0",
    creditoUrl: "https://commons.wikimedia.org/wiki/File:Templo_Budista_de_Foz_do_Igua%C3%A7u.jpg",
    licenca: "CC BY-SA 2.0",
    licencaUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
    resumo: "Jardins, esculturas e um espaço de contemplação na margem do Paraná.",
    descricao: "O templo reúne arquitetura inspirada na tradição budista e esculturas em jardins abertos à visitação. É um passeio tranquilo na região norte da cidade.",
    tempoVisita: "Aproximadamente 1 hora",
    melhorEpoca: "Manhã ou fim da tarde",
  },
];

export function buscarDestino(slug: string): Destino | undefined {
  return DESTINOS.find((destino) => destino.slug === slug);
}