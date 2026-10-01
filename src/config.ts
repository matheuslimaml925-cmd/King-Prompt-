/**
 * ============================================================================
 * CONFIGURAÇÃO CENTRAL — KING PROMPT™ (LINK-IN-BIO)
 * ============================================================================
 *
 * 1. FOTO DE PERFIL (FALLBACK EDITÁVEL):
 *    Caso a sincronização automática via API Oficial do Instagram/Meta
 *    (INSTAGRAM_ACCESS_TOKEN) não esteja ativa, basta inserir a URL direta
 *    da sua foto real do Instagram na variável `INSTAGRAM_PROFILE_IMAGE` abaixo
 *    (ou atualizar diretamente pelo painel rápido de configuração na página).
 *
 * 2. LINKS DOS 5 BOTÕES PRINCIPAIS:
 *    Substitua os marcadores abaixo pelas URLs reais dos seus produtos,
 *    checkouts da Qify, páginas de vendas, materiais gratuitos ou cursos.
 * ============================================================================
 */

export const INSTAGRAM_PROFILE_IMAGE: string =
  import.meta.env.VITE_INSTAGRAM_PROFILE_IMAGE || "";

export interface KingPromptLinksConfig {
  "[LINK_PROMPTS_GRATUITOS]": string;
  "[LINK_PROMPTS_PREMIUM]": string;
  "[LINK_PROTOCOLO_MAPS]": string;
  "[LINK_GERACAO_IMAGENS]": string;
  "[LINK_FATURAR_COM_IA]": string;
}

export type KingPromptClicksConfig = Record<keyof KingPromptLinksConfig, number>;

export const INITIAL_CLICKS: KingPromptClicksConfig = {
  "[LINK_PROMPTS_GRATUITOS]": 0,
  "[LINK_PROMPTS_PREMIUM]": 0,
  "[LINK_PROTOCOLO_MAPS]": 0,
  "[LINK_GERACAO_IMAGENS]": 0,
  "[LINK_FATURAR_COM_IA]": 0,
};

export const KING_PROMPT_LINKS: KingPromptLinksConfig = {
  "[LINK_PROMPTS_GRATUITOS]": "[LINK_PROMPTS_GRATUITOS]",
  "[LINK_PROMPTS_PREMIUM]": "[LINK_PROMPTS_PREMIUM]",
  "[LINK_PROTOCOLO_MAPS]": "[LINK_PROTOCOLO_MAPS]",
  "[LINK_GERACAO_IMAGENS]": "[LINK_GERACAO_IMAGENS]",
  "[LINK_FATURAR_COM_IA]": "https://pay.kiwify.com.br/GyCXRiQ",
};

export interface BioButtonItem {
  id: string;
  configKey: keyof KingPromptLinksConfig;
  emoji: string;
  title: string;
  description: string;
  featured?: boolean;
}

export const BIO_BUTTONS: BioButtonItem[] = [
  {
    id: "prompts-gratis",
    configKey: "[LINK_PROMPTS_GRATUITOS]",
    emoji: "🎁",
    title: "PROMPTS GRÁTIS",
    description: "Comece a criar com IA gratuitamente.",
  },
  {
    id: "prompts-premium",
    configKey: "[LINK_PROMPTS_PREMIUM]",
    emoji: "👑",
    title: "PROMPTS PREMIUM",
    description: "Acesse a biblioteca premium do King Prompt.",
    featured: true,
  },
  {
    id: "protocolo-maps",
    configKey: "[LINK_PROTOCOLO_MAPS]",
    emoji: "📍",
    title: "PROTOCOLO MAPS",
    description: "Aprenda a prospectar clientes pelo Google Maps.",
  },
  {
    id: "geracao-imagens",
    configKey: "[LINK_GERACAO_IMAGENS]",
    emoji: "🤖",
    title: "IA PARA GERAR IMAGENS",
    description: "Aprenda a criar imagens profissionais com IA.",
  },
  {
    id: "faturar-com-ia",
    configKey: "[LINK_FATURAR_COM_IA]",
    emoji: "💰",
    title: "COMO FATURAR COM IA",
    description: "Descubra como transformar IA em oportunidade de negócio.",
  },
];
