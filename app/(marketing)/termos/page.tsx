import type { Metadata } from "next";

export const metadata: Metadata = { title: "Termos de Uso — Sponsas" };

const ATUALIZADO = "2 de setembro de 2026";

export default function TermosPage() {
  return (
    <main className="mx-auto max-w-[760px] px-6 py-16">
      <h1 className="text-5xl">Termos de Uso</h1>
      <p className="text-muted-foreground mt-3 text-sm">
        Última atualização: {ATUALIZADO}
      </p>

      <div className="prose-sponsas mt-10 flex flex-col gap-6 text-sm leading-relaxed">
        <p>
          Estes Termos regem o uso da plataforma Sponsas (&quot;Sponsas&quot;,
          &quot;nós&quot;), que conecta pilotos, atletas e criadores a empresas
          interessadas em patrocínio. Ao criar uma conta você concorda com estes
          Termos.
        </p>

        <Sec n="1" t="Conta">
          Você é responsável pelas informações que cadastra e por manter a senha
          em sigilo. É proibido criar contas falsas, se passar por terceiros ou
          publicar dados de outra pessoa sem autorização. Você deve ter 18 anos
          ou mais.
        </Sec>

        <Sec n="2" t="O que a Sponsas faz e não faz">
          A Sponsas é uma plataforma de intermediação: organiza perfis,
          oportunidades, propostas e o acompanhamento de entregas. A Sponsas{" "}
          <strong>não é parte</strong> dos acordos fechados entre piloto e
          empresa, não garante pagamento, entrega ou resultado, e não presta
          consultoria financeira ou jurídica.
        </Sec>

        <Sec n="3" t="Propostas, patrocínios e permutas">
          Valores, permutas, prazos e entregas são negociados diretamente entre
          as partes. Ao aceitar uma proposta, os termos ficam registrados na
          plataforma como referência. O cumprimento é responsabilidade das
          partes.
        </Sec>

        <Sec n="4" t="Rank Sponsas">
          O Rank Sponsas é um indicador calculado a partir de dados da própria
          plataforma (entregas no prazo, aprovações, engajamento informado,
          atividade). É uma referência automática e pode mudar. A Sponsas não
          garante que ele reflita com exatidão o valor de mercado de um
          patrocínio.
        </Sec>

        <Sec n="5" t="Conteúdo e comprovações">
          Você declara ter direito sobre o conteúdo, links e comprovações que
          envia. A Sponsas pode remover conteúdo que viole estes Termos, a lei
          ou direitos de terceiros.
        </Sec>

        <Sec n="6" t="Planos">
          O plano Free tem limites de uso descritos na página de Planos. O plano
          PRO remove esses limites. Enquanto não houver pagamento automatizado, o
          upgrade é combinado diretamente com a Sponsas.
        </Sec>

        <Sec n="7" t="Encerramento">
          Você pode encerrar sua conta a qualquer momento. Podemos suspender ou
          encerrar contas que violem estes Termos.
        </Sec>

        <Sec n="8" t="Limitação de responsabilidade">
          Na máxima extensão permitida pela lei, a Sponsas não responde por
          prejuízos decorrentes de acordos entre usuários, indisponibilidade do
          serviço ou uso indevido da plataforma por terceiros.
        </Sec>

        <Sec n="9" t="Alterações">
          Podemos atualizar estes Termos. Mudanças relevantes serão comunicadas
          na plataforma. O uso continuado após a alteração significa concordância.
        </Sec>

        <Sec n="10" t="Contato">
          Dúvidas: sponsasapp@gmail.com.
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
      <p className="text-muted-foreground mt-1">{children}</p>
    </section>
  );
}
