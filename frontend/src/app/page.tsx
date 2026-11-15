import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Compass, MapPin } from "@phosphor-icons/react/ssr";
import { DESTINOS } from "@/core/destinos";
import styles from "./home.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Kyr, início">
          <span className={styles.brandMark}><MapPin size={23} weight="bold" aria-hidden="true" /></span>
          <span className={styles.brandWord}>kyr</span>
        </Link>
        <nav className={styles.navigation} aria-label="Navegação principal">
          <Link href="/explorar">Explorar</Link>
          <a href="#sobre">Sobre</a>
          <Link href="/explorar">Destinos</Link>
          <Link href="/ajuda">Ajuda</Link>
        </nav>
        <div className={styles.accountActions}>
          <Link className={styles.signIn} href="/entrar">Entrar</Link>
          <Link className={styles.signUp} href="/cadastro">Criar conta</Link>
        </div>
      </header>

      <section className={styles.hero} aria-labelledby="hero-title">
        <Image
          className={styles.heroImage}
          src="/home-praia.jpg"
          alt="Praia tropical de areia clara e mar azul ao entardecer"
          fill
          priority
          sizes="100vw"
        />
        <div className={styles.heroShade} />
        <div className={styles.heroCopy}>
          <h1 id="hero-title">Descubra<br />novos caminhos</h1>
          <p className={styles.lead}>
            Encontre destinos incríveis, crie rotas personalizadas e viva experiências inesquecíveis.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryAction} href="/explorar">
              Explorar agora <ArrowRight size={19} weight="bold" aria-hidden="true" />
            </Link>
            <Link className={styles.secondaryAction} href="/cadastro">Criar conta</Link>
          </div>
          <div className={styles.routeNote}>
            <span className={styles.noteIcon}><Compass size={17} weight="fill" aria-hidden="true" /></span>
            <span>Explore Foz do Iguaçu sem conta.<br />Crie uma para guardar seus roteiros.</span>
          </div>
        </div>
      </section>

      <section className={styles.destinations} id="destinos" aria-labelledby="destinations-title">
        <div className={styles.destinationIntro} id="sobre">
          <p className={styles.sectionEyebrow}>Kyr · Know Your Route</p>
          <h2 id="destinations-title">Descubra lugares que merecem entrar no caminho.</h2>
        </div>
        <div className={styles.destinationList}>
          {DESTINOS.slice(0, 3).map((destination, index) => (
            <Link
              className={styles.destinationItem}
              href={`/destinos/${destination.slug}`}
              key={destination.slug}
            >
              <span className={styles.destinationNumber}>{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.destinationName}>{destination.nome}</span>
              <span className={styles.destinationCategory}>{destination.categoria}</span>
              <ArrowUpRight className={styles.destinationArrow} size={18} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <footer className={styles.footer} id="ajuda">
        <span>KYR · Foz do Iguaçu</span>
        <Link href="/criar-roteiro">Planejar uma viagem <ArrowRight size={15} aria-hidden="true" /></Link>
      </footer>
    </main>
  );
}
