import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.resolve(__dirname, "king-prompt-store.json");

interface StoredConfig {
  INSTAGRAM_PROFILE_IMAGE: string;
  links: {
    "[LINK_PROMPTS_GRATUITOS]": string;
    "[LINK_PROMPTS_PREMIUM]": string;
    "[LINK_PROTOCOLO_MAPS]": string;
    "[LINK_GERACAO_IMAGENS]": string;
    "[LINK_FATURAR_COM_IA]": string;
  };
  clicks: {
    "[LINK_PROMPTS_GRATUITOS]": number;
    "[LINK_PROMPTS_PREMIUM]": number;
    "[LINK_PROTOCOLO_MAPS]": number;
    "[LINK_GERACAO_IMAGENS]": number;
    "[LINK_FATURAR_COM_IA]": number;
  };
  instagramUsername?: string;
  lastSyncedAt?: string;
}

const DEFAULT_STORE: StoredConfig = {
  INSTAGRAM_PROFILE_IMAGE: process.env.VITE_INSTAGRAM_PROFILE_IMAGE || "",
  links: {
    "[LINK_PROMPTS_GRATUITOS]": "[LINK_PROMPTS_GRATUITOS]",
    "[LINK_PROMPTS_PREMIUM]": "[LINK_PROMPTS_PREMIUM]",
    "[LINK_PROTOCOLO_MAPS]": "[LINK_PROTOCOLO_MAPS]",
    "[LINK_GERACAO_IMAGENS]": "[LINK_GERACAO_IMAGENS]",
    "[LINK_FATURAR_COM_IA]": "https://pay.kiwify.com.br/GyCXRiQ",
  },
  clicks: {
    "[LINK_PROMPTS_GRATUITOS]": 0,
    "[LINK_PROMPTS_PREMIUM]": 0,
    "[LINK_PROTOCOLO_MAPS]": 0,
    "[LINK_GERACAO_IMAGENS]": 0,
    "[LINK_FATURAR_COM_IA]": 0,
  },
};

function readStore(): StoredConfig {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      const mergedLinks = {
        ...DEFAULT_STORE.links,
        ...(parsed.links || {}),
      };
      if (
        !mergedLinks["[LINK_FATURAR_COM_IA]"] ||
        mergedLinks["[LINK_FATURAR_COM_IA]"] === "[LINK_FATURAR_COM_IA]"
      ) {
        mergedLinks["[LINK_FATURAR_COM_IA]"] =
          DEFAULT_STORE.links["[LINK_FATURAR_COM_IA]"];
      }
      return {
        INSTAGRAM_PROFILE_IMAGE:
          typeof parsed.INSTAGRAM_PROFILE_IMAGE === "string"
            ? parsed.INSTAGRAM_PROFILE_IMAGE
            : DEFAULT_STORE.INSTAGRAM_PROFILE_IMAGE,
        links: mergedLinks,
        clicks: {
          ...DEFAULT_STORE.clicks,
          ...(parsed.clicks || {}),
        },
        instagramUsername: parsed.instagramUsername,
        lastSyncedAt: parsed.lastSyncedAt,
      };
    }
  } catch (err) {
    console.error("Failed to read store:", err);
  }
  return {
    ...DEFAULT_STORE,
    links: { ...DEFAULT_STORE.links },
    clicks: { ...DEFAULT_STORE.clicks },
  };
}

function writeStore(data: StoredConfig): void {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write store:", err);
  }
}

async function fetchOfficialInstagramProfilePhoto(accessToken: string): Promise<{
  success: boolean;
  profilePictureUrl?: string;
  username?: string;
  error?: string;
}> {
  try {
    // 1. Try Instagram Graph API /me endpoint (Instagram API with Instagram Login)
    const igUrl = `https://graph.instagram.com/me?fields=id,username,profile_picture_url&access_token=${encodeURIComponent(
      accessToken
    )}`;
    const igRes = await fetch(igUrl);
    if (igRes.ok) {
      const igData = (await igRes.json()) as {
        id?: string;
        username?: string;
        profile_picture_url?: string;
      };
      if (igData.profile_picture_url) {
        return {
          success: true,
          profilePictureUrl: igData.profile_picture_url,
          username: igData.username,
        };
      }
    }

    // 2. Try Meta Graph API for Instagram Business/Creator accounts linked to a Page
    const fbUrl = `https://graph.facebook.com/v20.0/me/accounts?fields=instagram_business_account{id,username,profile_picture_url}&access_token=${encodeURIComponent(
      accessToken
    )}`;
    const fbRes = await fetch(fbUrl);
    if (fbRes.ok) {
      const fbData = (await fbRes.json()) as {
        data?: Array<{
          instagram_business_account?: {
            username?: string;
            profile_picture_url?: string;
          };
        }>;
      };
      const igAccount = fbData.data?.find(
        (item) => item.instagram_business_account?.profile_picture_url
      )?.instagram_business_account;

      if (igAccount?.profile_picture_url) {
        return {
          success: true,
          profilePictureUrl: igAccount.profile_picture_url,
          username: igAccount.username,
        };
      }
    }

    return {
      success: false,
      error:
        "Não foi possível obter 'profile_picture_url' com o token informado na API Oficial da Meta/Instagram.",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro de conexão com a API Oficial do Instagram.",
    };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Return current configuration and auto-sync if INSTAGRAM_ACCESS_TOKEN is configured in env
  app.get("/api/config", async (_req, res) => {
    const currentStore = readStore();
    const envToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();

    if (envToken) {
      const syncResult = await fetchOfficialInstagramProfilePhoto(envToken);
      if (syncResult.success && syncResult.profilePictureUrl) {
        currentStore.INSTAGRAM_PROFILE_IMAGE = syncResult.profilePictureUrl;
        currentStore.instagramUsername = syncResult.username;
        currentStore.lastSyncedAt = new Date().toISOString();
        writeStore(currentStore);
        return res.json({
          ...currentStore,
          apiSyncActive: true,
        });
      }
    }

    return res.json({
      ...currentStore,
      apiSyncActive: Boolean(envToken && currentStore.lastSyncedAt),
    });
  });

  // Update INSTAGRAM_PROFILE_IMAGE and/or the 5 button links
  app.post("/api/config", (req, res) => {
    const currentStore = readStore();
    const { INSTAGRAM_PROFILE_IMAGE, links } = req.body || {};

    const updated: StoredConfig = {
      ...currentStore,
      INSTAGRAM_PROFILE_IMAGE:
        typeof INSTAGRAM_PROFILE_IMAGE === "string"
          ? INSTAGRAM_PROFILE_IMAGE.trim()
          : currentStore.INSTAGRAM_PROFILE_IMAGE,
      links: {
        ...currentStore.links,
        ...(links && typeof links === "object" ? links : {}),
      },
    };

    writeStore(updated);
    return res.json({
      ...updated,
      apiSyncActive: false,
    });
  });

  // Increment click counter for a specific button (BOTÃO 1-5)
  app.post("/api/clicks", (req, res) => {
    const { configKey } = req.body || {};
    const currentStore = readStore();

    if (
      typeof configKey === "string" &&
      Object.prototype.hasOwnProperty.call(currentStore.clicks, configKey)
    ) {
      const key = configKey as keyof StoredConfig["clicks"];
      currentStore.clicks[key] = (Number(currentStore.clicks[key]) || 0) + 1;
      writeStore(currentStore);
    }

    return res.json({
      success: true,
      clicks: currentStore.clicks,
    });
  });

  // Reset all click counters
  app.post("/api/clicks/reset", (_req, res) => {
    const currentStore = readStore();
    currentStore.clicks = { ...DEFAULT_STORE.clicks };
    writeStore(currentStore);
    return res.json({
      success: true,
      clicks: currentStore.clicks,
    });
  });

  // Optional manual trigger to sync via official Meta/Instagram Graph API Access Token
  app.post("/api/instagram/sync", async (req, res) => {
    const token =
      (typeof req.body?.accessToken === "string"
        ? req.body.accessToken.trim()
        : "") ||
      process.env.INSTAGRAM_ACCESS_TOKEN?.trim() ||
      "";

    if (!token) {
      return res.status(400).json({
        success: false,
        error:
          "Token da API Oficial do Instagram/Meta não informado. Utilize o campo INSTAGRAM_PROFILE_IMAGE como fallback.",
      });
    }

    const result = await fetchOfficialInstagramProfilePhoto(token);
    if (!result.success || !result.profilePictureUrl) {
      return res.status(400).json({
        success: false,
        error: result.error || "Não foi possível sincronizar via API Oficial.",
      });
    }

    const currentStore = readStore();
    currentStore.INSTAGRAM_PROFILE_IMAGE = result.profilePictureUrl;
    currentStore.instagramUsername = result.username;
    currentStore.lastSyncedAt = new Date().toISOString();
    writeStore(currentStore);

    return res.json({
      success: true,
      INSTAGRAM_PROFILE_IMAGE: result.profilePictureUrl,
      instagramUsername: result.username,
      lastSyncedAt: currentStore.lastSyncedAt,
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`KING PROMPT™ server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
