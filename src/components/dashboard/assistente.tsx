import { useMemo, useState } from "react";
import { Bot, MessageSquare, X } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { contextoDoPainel } from "@/lib/dash-context";
import { useDataset } from "@/lib/dataset-store";

const SUGESTOES = [
  "Acompanhando Previsto x Realizado, qual a previsão de déficit no fim do ano?",
  "Onde estão os maiores desvios de execução?",
  "Qual o ritmo mensal e o ritmo necessário para executar 100%?",
  "Quais centros de custo concentram o saldo a executar?",
];

type Msg = { id: string; role: "user" | "assistant"; text: string };

export function AssistenteVirtual() {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { dataset, filtros, receita } = useDataset();

  const contexto = useMemo(
    () => contextoDoPainel(dataset, filtros, receita),
    [dataset, filtros, receita],
  );

  const enviar = async (t: string) => {
    const pergunta = t.trim();
    if (!pergunta || carregando) return;
    setTexto("");
    setErro(null);
    const historico = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", text: pergunta }]);
    setCarregando(true);
    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta, contexto, filtros, historico }),
      });
      const data = (await resp.json()) as { resposta?: string; error?: string };
      if (!resp.ok || !data.resposta) {
        setErro(data.error ?? "Não foi possível responder agora.");
      } else {
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: "assistant", text: data.resposta! },
        ]);
      }
    } catch {
      setErro("Falha de conexão com o assistente.");
    } finally {
      setCarregando(false);
    }
  };

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-navy px-4 py-3 text-sm font-semibold text-navy-foreground shadow-lg transition-transform hover:scale-105"
        aria-label="Abrir assistente do painel"
      >
        <MessageSquare className="size-4" />
        Assistente
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex h-[min(78vh,620px)] w-[min(94vw,420px)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
      <header className="flex items-center justify-between gap-2 bg-navy px-4 py-3 text-navy-foreground">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Bot className="size-4" />
          Assistente do Painel
        </span>
        <button onClick={() => setAberto(false)} aria-label="Fechar assistente">
          <X className="size-4" />
        </button>
      </header>

      <Conversation className="flex-1">
        <ConversationContent className="gap-3">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Pergunte sobre o recorte atual do painel (filtros aplicados são considerados).
              </p>
              <div className="flex flex-col gap-2">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    onClick={() => void enviar(s)}
                    className="rounded-md border border-border px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <Message from={m.role} key={m.id}>
              <MessageContent>
                <MessageResponse>{m.text}</MessageResponse>
              </MessageContent>
            </Message>
          ))}

          {carregando && <Shimmer className="text-xs">Analisando os dados…</Shimmer>}
          {erro && <p className="text-xs text-crit">{erro}</p>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border p-2">
        <PromptInput
          onSubmit={(_, e) => {
            e.preventDefault();
            void enviar(texto);
          }}
        >
          <PromptInputTextarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ex.: qual a tendência de encerramento do exercício?"
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit
              status={carregando ? "submitted" : "ready"}
              disabled={!texto.trim() || carregando}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
