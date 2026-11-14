"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin } from "@phosphor-icons/react/ssr";
import { useState, type FormEvent } from "react";
import { ApiError } from "@/core/api";
import { cadastrar, entrar } from "@/core/sessao";
import styles from "./FormularioDeConta.module.css";

// Formulário único para as telas /entrar e /cadastro.
export default function FormularioDeConta({ modo }: { modo: "entrar" | "cadastro" }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const cadastro = modo === "cadastro";

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);

    if (cadastro && senha.length < 8) {
      setErro("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    setEnviando(true);
    try {
      if (cadastro) await cadastrar(nome.trim(), email.trim(), senha);
      else await entrar(email.trim(), senha);
      router.push("/inicio");
    } catch (falha) {
      setErro(
        falha instanceof ApiError || falha instanceof Error
          ? falha.message
          : "Não foi possível concluir agora. Tente novamente.",
      );
      setEnviando(false);
    }
  }

  return (
    <main className={styles.pagina}>
      <section className={styles.cartao} aria-labelledby="titulo-conta">
        <Link className={styles.marca} href="/" aria-label="Kyr, página inicial">
          <span><MapPin size={20} weight="bold" aria-hidden="true" /></span> kyr
        </Link>
        <h1 id="titulo-conta">{cadastro ? "Criar conta" : "Entrar"}</h1>
        <p className={styles.apoio}>
          {cadastro
            ? "Com uma conta, seus roteiros salvos ficam disponíveis em qualquer dispositivo e você pode avaliar destinos."
            : "Acesse seus roteiros salvos e avalie os destinos que visitou."}
        </p>

        <form className={styles.formulario} onSubmit={(evento) => void enviar(evento)} noValidate={false}>
          {cadastro && (
            <label>
              Nome
              <input
                type="text"
                name="nome"
                autoComplete="name"
                required
                maxLength={120}
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
              />
            </label>
          )}
          <label>
            E-mail
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              name="senha"
              autoComplete={cadastro ? "new-password" : "current-password"}
              required
              minLength={cadastro ? 8 : undefined}
              maxLength={72}
              value={senha}
              onChange={(evento) => setSenha(evento.target.value)}
            />
            {cadastro && <small>Pelo menos 8 caracteres.</small>}
          </label>

          {erro && <p className={styles.erro} role="alert">{erro}</p>}

          <button type="submit" disabled={enviando}>
            {enviando ? "Aguarde…" : cadastro ? "Criar conta" : "Entrar"}
          </button>
        </form>

        <p className={styles.troca}>
          {cadastro ? "Já tem conta? " : "Ainda não tem conta? "}
          <Link href={cadastro ? "/entrar" : "/cadastro"}>{cadastro ? "Entrar" : "Criar conta"}</Link>
        </p>
        <p className={styles.troca}>
          <Link href="/explorar">Continuar sem conta</Link>
        </p>
      </section>
    </main>
  );
}
