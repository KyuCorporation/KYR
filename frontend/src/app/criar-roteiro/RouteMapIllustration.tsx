import styles from "./page.module.css";
import { PinIcon } from "./icons";

type Props = {
  tempo: string;
  distancia: string;
};

/**
 * Ilustração estática do mapa/rota. Não depende de nenhuma API de mapas —
 * é apenas SVG + CSS para reproduzir o visual. Para uma integração real,
 * troque este componente pelo Maps JavaScript API (ver conversa anterior)
 * ou por outra lib de mapas (Mapbox, Leaflet, etc).
 */
export default function RouteMapIllustration({ tempo, distancia }: Props) {
  return (
    <div className={styles.mapIllustration}>
      <svg
        className={styles.mapSvg}
        viewBox="0 0 400 500"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ocean" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#bfe3ea" />
            <stop offset="100%" stopColor="#a9d9e2" />
          </linearGradient>
        </defs>

        <rect width="400" height="500" fill="url(#ocean)" />

        {/* Massa de terra estilizada (Brasil, simplificado) */}
        <path
          d="M60 40 C160 20 280 40 330 110 C360 160 340 220 320 260
             C300 310 320 360 300 410 C280 460 220 480 170 470
             C110 460 70 420 60 370 C40 320 60 270 50 220
             C40 160 20 90 60 40 Z"
          fill="#cdeadd"
        />
        <path
          d="M60 40 C160 20 280 40 330 110 C360 160 340 220 320 260
             C300 310 320 360 300 410 C280 460 220 480 170 470
             C110 460 70 420 60 370 C40 320 60 270 50 220
             C40 160 20 90 60 40 Z"
          fill="none"
          stroke="#a9d2bb"
          strokeWidth="1.5"
        />

        {/* Rota pontilhada */}
        <path
          d="M90 420 C130 380 150 340 175 300 C195 268 190 240 210 210
             C230 178 260 150 300 90"
          fill="none"
          stroke="#3B82F6"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="1 11"
        />

        {/* Pontos de interesse ao longo da rota */}
        <circle cx="175" cy="300" r="5" fill="#FACC15" stroke="white" strokeWidth="1.5" />
        <circle cx="196" cy="266" r="5" fill="#EF4444" stroke="white" strokeWidth="1.5" />
        <circle cx="146" cy="333" r="6" fill="#A78BFA" stroke="white" strokeWidth="1.5" />
      </svg>

      {/* Marcador de origem */}
      <div className={styles.originPin}>
        <PinIcon color="#EF4444" />
      </div>

      {/* Marcador de destino */}
      <div className={styles.destinationPin}>D</div>

      {/* Badge de tempo/distância */}
      <div className={styles.routeBadge}>
        <span>🚗 {tempo}</span>
        <span className={styles.routeBadgeDivider} />
        <span>{distancia}</span>
      </div>

      <div className={styles.mapControls}>
        <button type="button" aria-label="Ampliar mapa" className={styles.mapControlButton} />
        <button type="button" aria-label="Reduzir mapa" className={styles.mapControlButton} />
      </div>
    </div>
  );
}