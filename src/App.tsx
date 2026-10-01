/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { ArrowUpRight, SlidersHorizontal } from "lucide-react";
import {
  BIO_BUTTONS,
  INITIAL_CLICKS,
  INSTAGRAM_PROFILE_IMAGE,
  KING_PROMPT_LINKS,
  KingPromptClicksConfig,
  KingPromptLinksConfig,
} from "./config";
import { DigitalParticles } from "./components/DigitalParticles";
import { ConfigDrawer } from "./components/ConfigDrawer";

const LOCAL_STORAGE_KEY = "king_prompt_bio_config_v1";

function isPlaceholderOrEmpty(value: string | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return /^\[LINK_[A-Z0-9_]+\]$/.test(trimmed);
}

function normalizeTargetUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed || isPlaceholderOrEmpty(trimmed)) {
    return "#";
  }
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export default function App() {
  const [profileImage, setProfileImage] = useState<string>(
    INSTAGRAM_PROFILE_IMAGE
  );
  const [links, setLinks] = useState<KingPromptLinksConfig>(KING_PROMPT_LINKS);
  const [clicks, setClicks] = useState<KingPromptClicksConfig>(INITIAL_CLICKS);
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);
  const [apiSyncActive, setApiSyncActive] = useState<boolean>(false);
  const [instagramUsername, setInstagramUsername] = useState<
    string | undefined
  >(undefined);

  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(true);
  const [focusedConfigKey, setFocusedConfigKey] = useState<string | null>(
    "[LINK_FATURAR_COM_IA]"
  );

  // Load saved configuration & click metrics from localStorage & backend API
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("config") === "1" || params.get("edit") === "1") {
      setIsConfigOpen(true);
    }

    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (
          typeof parsed.INSTAGRAM_PROFILE_IMAGE === "string" &&
          parsed.INSTAGRAM_PROFILE_IMAGE.trim()
        ) {
          setProfileImage(parsed.INSTAGRAM_PROFILE_IMAGE.trim());
        }
        if (parsed.links && typeof parsed.links === "object") {
          setLinks((prev) => {
            const next = { ...prev };
            for (const key of Object.keys(next) as Array<
              keyof KingPromptLinksConfig
            >) {
              const cachedVal = parsed.links[key];
              if (
                typeof cachedVal === "string" &&
                cachedVal.trim() &&
                !isPlaceholderOrEmpty(cachedVal)
              ) {
                next[key] = cachedVal.trim();
              }
            }
            return next;
          });
        }
        if (parsed.clicks && typeof parsed.clicks === "object") {
          setClicks((prev) => ({ ...prev, ...parsed.clicks }));
        }
      }
    } catch {
      // Ignore storage read errors
    }

    fetch("/api/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (
          typeof data.INSTAGRAM_PROFILE_IMAGE === "string" &&
          data.INSTAGRAM_PROFILE_IMAGE.trim()
        ) {
          setProfileImage(data.INSTAGRAM_PROFILE_IMAGE.trim());
          setImageLoadError(false);
        }
        if (data.links && typeof data.links === "object") {
          setLinks((prev) => {
            const merged = { ...prev };
            for (const key of Object.keys(merged) as Array<
              keyof KingPromptLinksConfig
            >) {
              const incoming = data.links[key];
              if (
                typeof incoming === "string" &&
                incoming.trim() &&
                !isPlaceholderOrEmpty(incoming)
              ) {
                merged[key] = incoming.trim();
              }
            }
            return merged;
          });
        }
        if (data.clicks && typeof data.clicks === "object") {
          setClicks((prev) => {
            const merged = { ...prev };
            for (const key of Object.keys(merged) as Array<
              keyof KingPromptClicksConfig
            >) {
              const serverCount = Number(data.clicks[key]) || 0;
              merged[key] = Math.max(merged[key] || 0, serverCount);
            }
            return merged;
          });
        }
        setApiSyncActive(Boolean(data.apiSyncActive));
        if (data.instagramUsername) {
          setInstagramUsername(data.instagramUsername);
        }
      })
      .catch(() => {
        // Fallback silently to local values
      });
  }, []);

  const persistToLocalStorage = (
    nextImage: string,
    nextLinks: KingPromptLinksConfig,
    nextClicks: KingPromptClicksConfig
  ) => {
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          INSTAGRAM_PROFILE_IMAGE: nextImage,
          links: nextLinks,
          clicks: nextClicks,
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  };

  const handleSaveConfig = async (
    newProfileImage: string,
    newLinks: KingPromptLinksConfig
  ) => {
    const cleanedImage = newProfileImage.trim();
    setProfileImage(cleanedImage);
    setLinks(newLinks);
    setImageLoadError(false);

    persistToLocalStorage(cleanedImage, newLinks, clicks);

    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          INSTAGRAM_PROFILE_IMAGE: cleanedImage,
          links: newLinks,
        }),
      });
    } catch {
      // Keep local state if offline
    }
  };

  const handleTrackButtonClick = (configKey: keyof KingPromptLinksConfig) => {
    setClicks((prev) => {
      const updated: KingPromptClicksConfig = {
        ...prev,
        [configKey]: (prev[configKey] || 0) + 1,
      };
      persistToLocalStorage(profileImage, links, updated);
      return updated;
    });

    fetch("/api/clicks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ configKey }),
      keepalive: true,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.clicks) {
          setClicks((prev) => {
            const synced = { ...prev, ...data.clicks };
            persistToLocalStorage(profileImage, links, synced);
            return synced;
          });
        }
      })
      .catch(() => {
        // Already persisted optimistically in localStorage
      });
  };

  const handleResetClicks = async () => {
    setClicks(INITIAL_CLICKS);
    persistToLocalStorage(profileImage, links, INITIAL_CLICKS);

    try {
      await fetch("/api/clicks/reset", {
        method: "POST",
      });
    } catch {
      // Keep local reset state
    }
  };

  const handleSyncInstagramToken = async (
    token: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/instagram/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Falha ao sincronizar com a API do Instagram.",
        };
      }
      if (data.INSTAGRAM_PROFILE_IMAGE) {
        setProfileImage(data.INSTAGRAM_PROFILE_IMAGE);
        setImageLoadError(false);
        setApiSyncActive(true);
        setInstagramUsername(data.instagramUsername);
      }
      return { success: true };
    } catch {
      return {
        success: false,
        error: "Erro de comunicação ao tentar conectar com a API.",
      };
    }
  };

  const openConfigForKey = (key: string) => {
    setFocusedConfigKey(key);
    setIsConfigOpen(true);
  };

  const hasValidProfilePhoto =
    Boolean(profileImage && profileImage.trim()) &&
    profileImage.trim() !== "INSTAGRAM_PROFILE_IMAGE" &&
    profileImage.trim() !== "[INSTAGRAM_PROFILE_IMAGE]" &&
    !imageLoadError;

  // Compute total clicks & top converting offer across BOTÃO 1-5
  const totalClicks = (
    Object.values(clicks) as number[]
  ).reduce((acc, val) => acc + (Number(val) || 0), 0);
  const maxClicks = Math.max(
    ...(Object.values(clicks) as number[]).map((v) => Number(v) || 0)
  );

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#070809] text-white selection:bg-[#00FF66]/20 selection:text-[#00FF66]">
      {/* Ambient top neon glow — subtle and controlled */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-[-140px] left-1/2 z-0 h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-[#00FF66]/[0.06] blur-[110px]"
      />

      {/* Subtle digital background particles */}
      <DigitalParticles />

      {/* Main centered mobile-first column */}
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[430px] flex-col items-center justify-between px-5 pt-10 pb-9 sm:pt-14 sm:pb-12">
        <div className="flex w-full flex-col items-center">
          {/* 1. FOTO DE PERFIL DO INSTAGRAM */}
          <div className="relative mb-5 flex flex-col items-center">
            {/* Subtle neon ring glow */}
            <div
              aria-hidden="true"
              className="neon-ring-pulse pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-b from-[#00FF66]/45 via-[#00FF66]/15 to-transparent blur-md"
            />

            <div className="relative h-28 w-28 rounded-full bg-gradient-to-b from-[#00FF66]/70 via-[#00FF66]/25 to-white/10 p-[2px] shadow-[0_0_30px_rgba(0,255,102,0.16)] sm:h-32 sm:w-32">
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#0B0E11]">
                {hasValidProfilePhoto ? (
                  <img
                    src={profileImage}
                    alt="KING PROMPT™"
                    referrerPolicy="no-referrer"
                    onError={() => setImageLoadError(true)}
                    onClick={() => openConfigForKey("INSTAGRAM_PROFILE_IMAGE")}
                    className="h-full w-full cursor-pointer rounded-full object-cover contrast-[1.02] transition-transform duration-300 hover:scale-[1.02]"
                  />
                ) : (
                  /* Fallback circular frame — strictly no artificial photo, no generated avatar, no generic icon */
                  <button
                    type="button"
                    onClick={() => openConfigForKey("INSTAGRAM_PROFILE_IMAGE")}
                    className="group flex h-full w-full flex-col items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_30%,#131A16_0%,#090B0D_75%)] px-3 text-center transition-colors hover:bg-[#111714] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF66]"
                    title="Clique para definir INSTAGRAM_PROFILE_IMAGE"
                  >
                    <span className="font-mono text-[9px] font-medium tracking-wider text-[#00FF66]/90">
                      FOTO REAL
                    </span>
                    <span className="mt-1 text-[10px] leading-tight text-zinc-400 transition-colors group-hover:text-white">
                      Adicionar foto do Instagram
                    </span>
                  </button>
                )}
              </div>

              {/* Tiny luminous status dot on the circular frame */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-1.5 bottom-1.5 h-3 w-3 rounded-full border-2 border-[#070809] bg-[#00FF66] shadow-[0_0_8px_#00FF66]"
              />
            </div>
          </div>

          {/* 2. CABEÇALHO */}
          <header className="mb-8 flex flex-col items-center text-center">
            <h1 className="font-['Outfit'] text-2xl font-extrabold tracking-[0.06em] text-white sm:text-[28px]">
              KING PROMPT<span className="text-[#00FF66]">™</span>
            </h1>

            <p className="mt-1.5 text-base font-semibold tracking-tight text-[#00FF66]">
              Prompts que convertem.
            </p>

            <p className="mt-2 max-w-[310px] text-sm leading-relaxed font-normal text-zinc-400 [text-wrap:balance]">
              IA aplicada à criação de imagens, conteúdo e vendas.
            </p>
          </header>

          {/* 3. OS 5 BOTÕES PRINCIPAIS */}
          <section
            aria-label="Links principais"
            className="flex w-full flex-col gap-3.5"
          >
            {BIO_BUTTONS.map((button) => {
              const rawUrl = links[button.configKey];
              const isPlaceholder = isPlaceholderOrEmpty(rawUrl);
              const resolvedHref = normalizeTargetUrl(rawUrl);

              const clickCount = Number(clicks[button.configKey]) || 0;
              const clickSharePercent =
                totalClicks > 0
                  ? Math.round((clickCount / totalClicks) * 100)
                  : 0;
              const isTopConverting =
                totalClicks > 0 && clickCount > 0 && clickCount === maxClicks;

              const handleButtonClick = (
                e: React.MouseEvent<HTMLAnchorElement>
              ) => {
                // Record click on BOTÃO 1-5
                handleTrackButtonClick(button.configKey);

                if (isPlaceholder) {
                  e.preventDefault();
                  openConfigForKey(button.configKey);
                }
              };

              return (
                <a
                  key={button.id}
                  href={resolvedHref}
                  target={isPlaceholder ? undefined : "_blank"}
                  rel={isPlaceholder ? undefined : "noopener noreferrer"}
                  onClick={handleButtonClick}
                  data-config-key={button.configKey}
                  className={`group relative flex w-full flex-col justify-between rounded-2xl border px-4 pt-3.5 pb-2.5 text-left transition-all duration-150 ease-out hover:scale-[1.016] active:scale-[0.985] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF66] ${
                    button.featured
                      ? "border-[#00FF66]/30 bg-gradient-to-r from-[#101613] via-[#101317] to-[#0E1114] shadow-[0_0_25px_-10px_rgba(0,255,102,0.22)] hover:border-[#00FF66]/65 hover:shadow-[0_0_28px_-5px_rgba(0,255,102,0.32)]"
                      : "border-white/[0.08] bg-[#0F1216]/90 hover:border-[#00FF66]/45 hover:bg-[#13181D] hover:shadow-[0_0_24px_-6px_rgba(0,255,102,0.2)]"
                  }`}
                >
                  {/* Subtle top edge luminous highlight */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-6 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00FF66]/30 to-transparent opacity-60 transition-opacity duration-150 group-hover:opacity-100"
                  />

                  {/* Main Button Row */}
                  <div className="flex w-full items-center justify-between gap-3.5">
                    <div className="flex min-w-0 flex-1 items-center gap-3.5">
                      {/* Emoji container */}
                      <span
                        aria-hidden="true"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-[#090B0E] text-xl shadow-inner transition-colors duration-150 group-hover:border-[#00FF66]/35 group-hover:bg-[#0B110E]"
                      >
                        {button.emoji}
                      </span>

                      {/* Title & Description */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-['Outfit'] text-[15px] font-bold tracking-[0.02em] text-white transition-colors duration-150 group-hover:text-[#00FF66]">
                            {button.title}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-zinc-400 transition-colors duration-150 group-hover:text-zinc-300">
                          {button.description}
                        </p>
                      </div>
                    </div>

                    {/* Click affordance indicator */}
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.02] text-zinc-500 transition-all duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:border-[#00FF66]/40 group-hover:bg-[#00FF66]/10 group-hover:text-[#00FF66]"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>

                  {/* Discreet Click Counter Footer inside each Button */}
                  <div className="mt-2.5 flex items-center justify-between border-t border-white/[0.04] pt-1.5 font-mono text-[10px] tracking-wide text-zinc-500 tabular-nums transition-colors duration-150 group-hover:text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 rounded-full transition-colors ${
                          clickCount > 0
                            ? "bg-[#00FF66]/80 shadow-[0_0_6px_rgba(0,255,102,0.5)]"
                            : "bg-zinc-700 group-hover:bg-[#00FF66]/50"
                        }`}
                      />
                      <span>
                        {clickCount} {clickCount === 1 ? "clique" : "cliques"}
                      </span>
                    </div>

                    {totalClicks > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px]">
                        {isTopConverting && (
                          <>
                            <span className="text-[#00FF66]/80">
                              maior conversão
                            </span>
                            <span aria-hidden="true">·</span>
                          </>
                        )}
                        <span>{clickSharePercent}%</span>
                      </div>
                    )}
                  </div>
                </a>
              );
            })}
          </section>
        </div>

        {/* 4. RODAPÉ */}
        <footer className="mt-12 flex flex-col items-center text-center">
          <div
            aria-hidden="true"
            className="mb-4 h-[1px] w-12 bg-gradient-to-r from-transparent via-[#00FF66]/40 to-transparent"
          />
          <p className="font-['Outfit'] text-xs font-bold tracking-[0.14em] text-zinc-300">
            KING PROMPT<span className="text-[#00FF66]">™</span>
          </p>
          <p className="mt-1 text-[10px] font-medium tracking-[0.18em] text-zinc-500">
            IA • PROMPTS • IMAGENS • MARKETING
          </p>
        </footer>
      </main>

      {/* Discreet owner trigger to edit INSTAGRAM_PROFILE_IMAGE and the 5 links anytime without rebuilding */}
      <button
        type="button"
        onClick={() => {
          setFocusedConfigKey(null);
          setIsConfigOpen(true);
        }}
        title="Configurar Foto e Links (KING PROMPT™)"
        aria-label="Configurar Foto e Links"
        className="fixed right-3.5 bottom-3.5 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#0D1014]/80 text-zinc-500 opacity-35 backdrop-blur-sm transition-all hover:border-[#00FF66]/40 hover:text-[#00FF66] hover:opacity-100 focus:opacity-100 focus:outline-none"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
      </button>

      {/* Live Configuration Drawer */}
      <ConfigDrawer
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        profileImage={profileImage}
        links={links}
        clicks={clicks}
        focusedKey={focusedConfigKey}
        apiSyncActive={apiSyncActive}
        instagramUsername={instagramUsername}
        onSave={handleSaveConfig}
        onResetClicks={handleResetClicks}
        onSyncInstagramToken={handleSyncInstagramToken}
      />
    </div>
  );
}
