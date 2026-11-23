import type { Metadata } from "next";
import Link from "next/link";
import ExploreSidebar from "@/components/ExploreSidebar";
import styles from "./privacidade.module.css";

export const metadata: Metadata = {
  title: "Privacidade | Kyr",
  description: "Quais dados o Kyr trata, para quê, com quem compartilha e como exercer seus direitos.",
};

const ATUALIZADA_EM = "21/11/2026";

export default function PrivacidadePage() {
  // Contato para pedidos que a página Minha conta não resolve. Fica em variável de ambiente para
  // não versionar o e-mail de ninguém. A página é gerada no build, então o valor vem do build.
  const CONTATO = process.env.NEXT_PUBLIC_CONTATO_PRIVACIDADE;
  return (
    <div className={styles.shell}>
      <ExploreSidebar active="privacidade" />
      <main className={styles.main}>
        <header className={styles.header}>
          <h1>Política de privacidade</h1>
          <p>Atualizada em {ATUALIZADA_EM}.</p>
        </header>

        <p className={styles.aviso}>
          O Kyr é um protótipo acadêmico, desenvolvido como trabalho de conclusão de curso (ADS, IFPE Campus Palmares).
          Esta página descreve, em linguagem direta, como ele trata dados pessoais, conforme a Lei Geral de Proteção de
          Dados (Lei nº 13.709/2018).
        </p>

        <section>
          <h2>Sem conta</h2>
          <p>
            Você pode explorar destinos e gerar roteiros sem criar conta. Nesse caso, o Kyr não guarda nenhum dado seu no
            servidor:
          </p>
          <ul>
            <li>
              A origem, o destino e as paradas de um roteiro são usados só para gerá-lo e não ficam gravados. O servidor
              guarda apenas a classificação feita pela IA para cada lugar público encontrado, sem ligação com quem pediu.
            </li>
            <li>
              Favoritos, roteiros salvos neste dispositivo e o último roteiro gerado ficam só no armazenamento do seu
              navegador. As coordenadas dos roteiros salvos no dispositivo são apagadas depois de 30 dias.
            </li>
          </ul>
        </section>

        <section>
          <h2>Com conta</h2>
          <div className={styles.tabela}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Dado</th>
                  <th scope="col">Para quê</th>
                  <th scope="col">Por quanto tempo</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Nome e e-mail</td>
                  <td>Identificar a conta e entrar nela. Nas avaliações, os outros usuários veem só o seu primeiro nome.</td>
                  <td>Até a exclusão da conta</td>
                </tr>
                <tr>
                  <td>Senha</td>
                  <td>Entrar na conta. Guardamos só um resumo criptográfico (bcrypt); ninguém consegue ler a senha.</td>
                  <td>Até a exclusão da conta</td>
                </tr>
                <tr>
                  <td>Sessão</td>
                  <td>Manter você conectado. O navegador guarda o código da sessão num cookie que o JavaScript da página não lê; o servidor guarda só um resumo dele.</td>
                  <td>30 dias, ou até sair da conta</td>
                </tr>
                <tr>
                  <td>Roteiros salvos</td>
                  <td>Reabrir os roteiros em qualquer aparelho. Guardamos o nome e as coordenadas da origem e do destino e os identificadores dos lugares sugeridos.</td>
                  <td>Coordenadas: 30 dias. O restante: até você remover o roteiro ou excluir a conta</td>
                </tr>
                <tr>
                  <td>Avaliações de destinos</td>
                  <td>Mostrar a opinião de viajantes. Nota e comentário são públicos, com o seu primeiro nome.</td>
                  <td>Até a exclusão da conta</td>
                </tr>
                <tr>
                  <td>Endereço IP</td>
                  <td>Limitar tentativas de login e de cadastro, contra ataques. Fica só na memória do servidor, sem gravação.</td>
                  <td>Até 1 hora</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            A conta existe para prestar o serviço que você pediu ao criá-la (art. 7º, V, da LGPD). O uso do IP para
            bloquear ataques se apoia no legítimo interesse de manter as contas seguras (art. 7º, IX).
          </p>
        </section>

        <section>
          <h2>Com quem os dados são compartilhados</h2>
          <ul>
            <li>
              <strong>Google Maps:</strong> o mapa e a busca de endereços são carregados do Google no seu navegador, que
              recebe o seu IP e o texto digitado na busca. Para montar o roteiro, o servidor envia ao Google as
              coordenadas da origem, do destino e das paradas.
            </li>
            <li>
              <strong>Provedores de inteligência artificial</strong> (Gemini, do Google, e, se ele falhar, outros
              provedores ou um modelo local): recebem só o nome, a categoria e a localização dos lugares públicos
              encontrados no trajeto. Nenhum dado da sua conta é enviado.
            </li>
            <li>
              <strong>Hospedagem:</strong> o provedor que executa o servidor e o banco de dados.
            </li>
          </ul>
          <p>
            Google e provedores de IA podem processar dados fora do Brasil (art. 33 da LGPD). O Kyr não vende dados nem
            os usa para publicidade.
          </p>
        </section>

        <section>
          <h2>Seus direitos</h2>
          <p>Em <Link href="/conta">Minha conta</Link> você pode, sem pedir a ninguém:</p>
          <ul>
            <li><strong>Acessar e levar seus dados:</strong> baixar, em JSON, tudo o que o servidor guarda sobre a sua conta.</li>
            <li><strong>Corrigir</strong> o seu nome.</li>
            <li><strong>Excluir a conta:</strong> apaga, na hora, a conta, as sessões, os roteiros salvos e as avaliações.</li>
            <li><strong>Apagar os dados deste dispositivo:</strong> favoritos, roteiros salvos no navegador e o último roteiro.</li>
          </ul>
          <p>
            Para outros pedidos, como trocar o e-mail ou tirar dúvidas sobre esta política,{" "}
            {CONTATO ? (
              <>escreva para <a href={`mailto:${CONTATO}`}>{CONTATO}</a>.</>
            ) : (
              <>fale com a equipe do projeto pelos canais do IFPE Campus Palmares.</>
            )}
          </p>
        </section>

        <section>
          <h2>Segurança</h2>
          <p>
            Senhas e códigos de sessão são guardados só como resumos criptográficos, a sessão fica num cookie protegido,
            as tentativas de login são limitadas e o aplicativo instalado no celular não guarda no aparelho as respostas
            com dados da sua conta.
          </p>
        </section>
      </main>
    </div>
  );
}
