import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de Privacidade — Sponsas" };

const ATUALIZADO = "2 de setembro de 2026";

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-[760px] px-6 py-16">
      <h1 className="text-5xl">Política de Privacidade</h1>
      <p className="text-muted-foreground mt-3 text-sm">
        Última atualização: {ATUALIZADO}
      </p>

      <div className="mt-10 flex flex-col gap-6 text-sm leading-relaxed">
        <p>
          Esta Política explica como a Sponsas trata dados pessoais, conforme a
          Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).
        </p>

        <Sec n="1" t="Dados que coletamos">
          <ul className="mt-1 list-disc pl-5">
            <li>
              <strong>Cadastro:</strong> nome, e-mail, tipo de conta (piloto ou
              empresa) e senha (armazenada de forma criptografada pelo provedor
              de autenticação).
            </li>
            <li>
              <strong>Perfil:</strong> cidade, estado, bio, dados esportivos ou
              da empresa, links e métricas de redes sociais que você informa,
              tabela de preços.
            </li>
            <li>
              <strong>Uso:</strong> oportunidades, candidaturas, propostas,
              patrocínios, entregas e comprovações que você cria na plataforma.
            </li>
            <li>
              <strong>Técnicos:</strong> registros de acesso e dados necessários
              para operar e proteger o serviço.
            </li>
          </ul>
        </Sec>

        <Sec n="2" t="Para que usamos">
          Operar a plataforma, conectar pilotos e empresas, exibir perfis
          públicos, calcular o Rank Sponsas, aplicar limites de plano, prevenir
          fraude e cumprir obrigações legais.
        </Sec>

        <Sec n="3" t="O que é público">
          Perfil do piloto (nome, foto, dados esportivos, métricas informadas,
          tabela de preços, tier do Rank Sponsas) e oportunidades abertas por
          empresas são <strong>públicos</strong>. Propostas, patrocínios,
          entregas, valores acordados e o plano da conta são visíveis{" "}
          <strong>apenas às partes envolvidas</strong>.
        </Sec>

        <Sec n="4" t="Compartilhamento">
          Não vendemos dados pessoais. Compartilhamos apenas com prestadores que
          viabilizam o serviço (hospedagem, banco de dados, autenticação e envio
          de e-mail) e quando exigido por lei.
        </Sec>

        <Sec n="5" t="Seus direitos (LGPD)">
          Você pode solicitar acesso, correção, portabilidade, anonimização ou
          exclusão dos seus dados, e revogar consentimento. Basta escrever para
          sponsasapp@gmail.com.
        </Sec>

        <Sec n="6" t="Retenção">
          Mantemos os dados enquanto a conta existir e pelo prazo necessário para
          cumprir obrigações legais. Ao encerrar a conta, os dados de perfil são
          removidos ou anonimizados.
        </Sec>

        <Sec n="7" t="Segurança">
          Adotamos medidas técnicas e organizacionais para proteger os dados,
          incluindo controle de acesso por linha (RLS) no banco de dados. Nenhum
          sistema é 100% seguro.
        </Sec>

        <Sec n="8" t="Contato / Encarregado (DPO)">
          Para assuntos de privacidade: sponsasapp@gmail.com.
        </Sec>

        <p className="text-muted-foreground text-xs">
          Este documento é um modelo inicial e deve ser revisado por um
          advogado antes da operação comercial.
        </p>
      </div>
    </main>
  );
}

function Sec({
  n,
  t,
  children,
}: {
  n: string;
  t: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold">
        {n}. {t}
      </h2>
      <div className="text-muted-foreground mt-1">{children}</div>
    </section>
  );
}
