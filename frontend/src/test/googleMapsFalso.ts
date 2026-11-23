import { vi } from "vitest";

// Versão mínima e falsa do SDK do Google Maps, com só o que RoteiroMap e GoogleMapRoute usam.
// Cada objeto criado fica registrado para o teste inspecionar o que o componente pediu ao mapa.
// As rotas pedidas à Directions ficam pendentes até o teste resolvê-las ou rejeitá-las.

type Opcoes = Record<string, unknown>;

export interface RotaPendente {
  pedido: Opcoes;
  resolver: (resultado: unknown) => void;
  rejeitar: (erro: unknown) => void;
}

export interface MapasCriados {
  mapas: MapaFalso[];
  marcadores: MarcadorFalso[];
  janelas: JanelaFalsa[];
  renderizadores: RenderizadorFalso[];
  linhas: LinhaFalsa[];
  rotas: RotaPendente[];
}

export class MapaFalso {
  fitBounds = vi.fn();
  setCenter = vi.fn();
  setZoom = vi.fn();
  panTo = vi.fn();
  constructor(readonly elemento: HTMLElement, readonly opcoes: Opcoes) {}
}

export class MarcadorFalso {
  readonly ouvintes = new Map<string, () => void>();
  setMap = vi.fn();
  constructor(readonly opcoes: Opcoes) {}
  addListener(evento: string, ouvinte: () => void) {
    this.ouvintes.set(evento, ouvinte);
  }
  clicar() {
    this.ouvintes.get("click")?.();
  }
  get titulo() {
    return this.opcoes.title as string;
  }
  get rotulo() {
    return (this.opcoes.label as { text: string }).text;
  }
  get cor() {
    return (this.opcoes.icon as { fillColor: string }).fillColor;
  }
}

export class JanelaFalsa {
  setContent = vi.fn();
  open = vi.fn();
}

export class RenderizadorFalso {
  setDirections = vi.fn();
  setMap = vi.fn();
  set = vi.fn();
  constructor(readonly opcoes: Opcoes) {}
}

export class LinhaFalsa {
  setMap = vi.fn();
  constructor(readonly opcoes: Opcoes) {}
}

export function instalarGoogleMapsFalso(): MapasCriados {
  const criados: MapasCriados = { mapas: [], marcadores: [], janelas: [], renderizadores: [], linhas: [], rotas: [] };

  class LatLngBounds {
    readonly pontos: unknown[] = [];
    extend(ponto: unknown) {
      this.pontos.push(ponto);
    }
    getCenter() {
      return this.pontos[0];
    }
  }

  vi.stubGlobal("google", {
    maps: {
      Map: class extends MapaFalso {
        constructor(elemento: HTMLElement, opcoes: Opcoes) {
          super(elemento, opcoes);
          criados.mapas.push(this);
        }
      },
      Marker: class extends MarcadorFalso {
        constructor(opcoes: Opcoes) {
          super(opcoes);
          criados.marcadores.push(this);
        }
      },
      InfoWindow: class extends JanelaFalsa {
        constructor() {
          super();
          criados.janelas.push(this);
        }
      },
      DirectionsRenderer: class extends RenderizadorFalso {
        constructor(opcoes: Opcoes) {
          super(opcoes);
          criados.renderizadores.push(this);
        }
      },
      Polyline: class extends LinhaFalsa {
        constructor(opcoes: Opcoes) {
          super(opcoes);
          criados.linhas.push(this);
        }
      },
      DirectionsService: class {
        route(pedido: Opcoes) {
          return new Promise((resolver, rejeitar) => criados.rotas.push({ pedido, resolver, rejeitar }));
        }
      },
      LatLngBounds,
      SymbolPath: { CIRCLE: 0 },
    },
  });

  return criados;
}
