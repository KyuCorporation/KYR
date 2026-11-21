import { describe, expect, it } from "vitest";
import { formatRouteTotal } from "@/core/routeMetrics";

describe("formatRouteTotal", () => {
  it("soma as distâncias em quilômetros com uma casa decimal", () => {
    expect(formatRouteTotal([1200, 350], "distance")).toBe("1,6 km");
    expect(formatRouteTotal([3000], "distance")).toBe("3 km");
  });

  it("mostra minutos e passa para horas a partir de 60 minutos", () => {
    expect(formatRouteTotal([600, 290], "duration")).toBe("15 min");
    expect(formatRouteTotal([3600, 900], "duration")).toBe("1h 15min");
  });

  it("fica indisponível sem trechos ou com algum trecho sem valor", () => {
    expect(formatRouteTotal([], "distance")).toBe("Indisponível");
    expect(formatRouteTotal([100, null], "duration")).toBe("Indisponível");
  });
});
