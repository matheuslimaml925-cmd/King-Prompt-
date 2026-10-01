import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  Image as ImageIcon,
  Link2,
  RefreshCw,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import {
  BIO_BUTTONS,
  KingPromptClicksConfig,
  KingPromptLinksConfig,
} from "../config";

interface ConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profileImage: string;
  links: KingPromptLinksConfig;
  clicks: KingPromptClicksConfig;
  focusedKey?: string | null;
  apiSyncActive?: boolean;
  instagramUsername?: string;
  onSave: (newProfileImage: string, newLinks: KingPromptLinksConfig) => Promise<void>;
  onResetClicks: () => Promise<void>;
  onSyncInstagramToken: (token: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
}

export function ConfigDrawer({
  isOpen,
  onClose,
  profileImage,
  links,
  clicks,
  focusedKey,
  apiSyncActive,
  instagramUsername,
  onSave,
  onResetClicks,
  onSyncInstagramToken,
}: ConfigDrawerProps) {
  const [draftImage, setDraftImage] = useState(profileImage);
  const [draftLinks, setDraftLinks] = useState<KingPromptLinksConfig>(links);
  const [igToken, setIgToken] = useState("");
  const [showApiSync, setShowApiSync] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setDraftImage(profileImage);
    setDraftLinks(links);
  }, [profileImage, links, isOpen]);

  useEffect(() => {
    if (isOpen && focusedKey) {
      const timer = setTimeout(() => {
        const el = inputRefs.current[focusedKey];
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus();
          el.select();
        }
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen, focusedKey]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setDraftImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(draftImage, draftLinks);
      setSavedToast(true);
      setTimeout(() => {
        setSavedToast(false);
        onClose();
      }, 650);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncClick = async () => {
    setSyncLoading(true);
    setSyncMessage(null);
    try {
      const res = await onSyncInstagramToken(igToken);
      if (res.success) {
        setSyncMessage({
          type: "success",
          text: "Foto sincronizada via API Oficial do Instagram!",
        });
      } else {
        setSyncMessage({
          type: "error",
          text:
            res.error ||
            "Não foi possível sincronizar. Use o campo INSTAGRAM_PROFILE_IMAGE abaixo.",
        });
      }
    } finally {
      setSyncLoading(false);
    }
  };

  const handleCopyConfigSnippet = () => {
    const snippet = `export const INSTAGRAM_PROFILE_IMAGE = ${JSON.stringify(
      draftImage
    )};\n\nexport const KING_PROMPT_LINKS = ${JSON.stringify(
      draftLinks,
      null,
      2
    )};`;
    navigator.clipboard.writeText(snippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="config-drawer-title"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-[460px] flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0C0E11] text-white shadow-2xl sm:rounded-3xl">
        {/* Top grab handle for mobile */}
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/15 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2
              id="config-drawer-title"
              className="font-['Outfit'] text-base font-bold tracking-wide text-white"
            >
              CONFIGURAÇÃO KING PROMPT™
            </h2>
            <p className="text-xs text-zinc-400">
              Edite a foto e os 5 links sem precisar reconstruir a página
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-colors hover:border-white/20 hover:text-white"
            aria-label="Fechar configuração"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form
          onSubmit={handleSaveSubmit}
          className="flex-1 space-y-5 overflow-y-auto px-5 py-5"
        >
          {/* 1. INSTAGRAM_PROFILE_IMAGE */}
          <div className="space-y-2.5 rounded-2xl border border-white/10 bg-[#111418] p-4">
            <div className="flex items-center justify-between">
              <label
                htmlFor="input-instagram-profile-image"
                className="flex items-center gap-2 font-mono text-xs font-medium text-[#00FF66]"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                &quot;INSTAGRAM_PROFILE_IMAGE&quot;
              </label>
              <span className="text-[11px] text-zinc-400">
                {apiSyncActive
                  ? `Sincronizado ${
                      instagramUsername ? `(@${instagramUsername})` : "via API"
                    }`
                  : "Fallback Editável Ativo"}
              </span>
            </div>

            <p className="text-xs leading-relaxed text-zinc-400">
              Insira a URL direta da sua foto real do Instagram ou envie a foto
              diretamente do seu aparelho:
            </p>

            <div className="flex gap-2">
              <input
                id="input-instagram-profile-image"
                ref={(el) => {
                  inputRefs.current["INSTAGRAM_PROFILE_IMAGE"] = el;
                }}
                type="text"
                value={draftImage}
                onChange={(e) => setDraftImage(e.target.value)}
                placeholder="https://... (URL da sua foto real)"
                className="w-full rounded-xl border border-white/10 bg-[#080A0C] px-3.5 py-2.5 font-mono text-xs text-white placeholder-zinc-600 focus:border-[#00FF66] focus:outline-none"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Enviar foto real do dispositivo"
                className="flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-medium text-white transition-colors hover:border-[#00FF66]/50 hover:bg-[#00FF66]/10"
              >
                <Upload className="h-3.5 w-3.5 text-[#00FF66]" />
                <span>Foto</span>
              </button>
            </div>

            {/* Optional Official Instagram Graph API Connection */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowApiSync((prev) => !prev)}
                className="text-[11px] text-zinc-400 underline decoration-zinc-600 underline-offset-4 transition-colors hover:text-white"
              >
                {showApiSync
                  ? "Ocultar integração via API Oficial do Instagram/Meta"
                  : "Possui Access Token da API Oficial do Instagram/Meta?"}
              </button>

              {showApiSync && (
                <div className="mt-2.5 space-y-2 rounded-xl border border-white/10 bg-[#080A0C] p-3">
                  <p className="text-[11px] leading-relaxed text-zinc-400">
                    Para sincronização automática via Graph API da Meta (
                    <code className="text-zinc-300">graph.instagram.com/me</code>
                    ), informe seu token de acesso oficial ou configure{" "}
                    <code className="text-zinc-300">INSTAGRAM_ACCESS_TOKEN</code>{" "}
                    nas variáveis de ambiente.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={igToken}
                      onChange={(e) => setIgToken(e.target.value)}
                      placeholder="IGQVJ... (Access Token da Meta)"
                      className="w-full rounded-lg border border-white/10 bg-[#111418] px-3 py-2 font-mono text-xs text-white placeholder-zinc-600 focus:border-[#00FF66] focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={syncLoading || !igToken.trim()}
                      onClick={handleSyncClick}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-40"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${
                          syncLoading ? "animate-spin text-[#00FF66]" : ""
                        }`}
                      />
                      <span>Sincronizar</span>
                    </button>
                  </div>
                  {syncMessage && (
                    <p
                      className={`text-[11px] ${
                        syncMessage.type === "success"
                          ? "text-[#00FF66]"
                          : "text-amber-400"
                      }`}
                    >
                      {syncMessage.text}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. FIVE EDITABLE BUTTON LINKS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-zinc-300">
                <Link2 className="h-3.5 w-3.5 text-[#00FF66]" />
                LINKS DOS 5 BOTÕES PRINCIPAIS
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onResetClicks}
                  className="flex items-center gap-1 text-[11px] text-zinc-400 transition-colors hover:text-white"
                  title="Zerar todos os contadores de cliques"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Zerar cliques</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyConfigSnippet}
                  className="flex items-center gap-1 text-[11px] text-zinc-400 transition-colors hover:text-[#00FF66]"
                >
                  {copiedCode ? (
                    <>
                      <Check className="h-3 w-3 text-[#00FF66]" />
                      <span className="text-[#00FF66]">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copiar config.ts</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {BIO_BUTTONS.map((btn, index) => {
              const count = clicks[btn.configKey] || 0;
              return (
                <div
                  key={btn.id}
                  className="space-y-1.5 rounded-xl border border-white/10 bg-[#111418] p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor={`input-${btn.id}`}
                      className="text-xs font-semibold text-white"
                    >
                      {btn.emoji} {btn.title}
                    </label>
                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      <span className="text-zinc-400 tabular-nums">
                        BOTÃO {index + 1} · {count}{" "}
                        {count === 1 ? "clique" : "cliques"}
                      </span>
                      <span className="text-zinc-600">/</span>
                      <span className="text-[#00FF66]/90">{btn.configKey}</span>
                    </div>
                  </div>
                  <input
                    id={`input-${btn.id}`}
                    ref={(el) => {
                      inputRefs.current[btn.configKey] = el;
                    }}
                    type="text"
                    value={draftLinks[btn.configKey]}
                    onChange={(e) =>
                      setDraftLinks((prev) => ({
                        ...prev,
                        [btn.configKey]: e.target.value,
                      }))
                    }
                    placeholder={btn.configKey}
                    className="w-full rounded-lg border border-white/10 bg-[#080A0C] px-3 py-2 font-mono text-xs text-white placeholder-zinc-600 focus:border-[#00FF66] focus:outline-none"
                  />
                </div>
              );
            })}
          </div>

          {/* Save Footer */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#00FF66] px-4 text-sm font-bold text-[#050806] shadow-[0_0_24px_rgba(0,255,102,0.25)] transition-all hover:bg-[#19ff75] active:scale-[0.99] disabled:opacity-50"
            >
              {savedToast ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>CONFIGURAÇÕES SALVAS!</span>
                </>
              ) : (
                <span>{saving ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
