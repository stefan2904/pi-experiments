import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const PROVIDER_NAME = "kilo-code";
const KILO_BASE_URL = "https://api.kilo.ai/api/gateway";
const KILO_MODELS_URL = `${KILO_BASE_URL}/models`;
const KILO_API_KEY_ENV = "KILO_API_KEY";

type InputModality = "text" | "image";

type KiloModelConfig = {
	id: string;
	name: string;
	reasoning: boolean;
	input: InputModality[];
	cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
	contextWindow: number;
	maxTokens: number;
	compat: {
		maxTokensField: "max_tokens";
		supportsDeveloperRole: false;
		supportsReasoningEffort: false;
		supportsUsageInStreaming: false;
	};
};

interface KiloGatewayModel {
	id?: string;
	name?: string;
	context_length?: number;
	architecture?: {
		input_modalities?: string[];
	};
	top_provider?: {
		context_length?: number;
		max_completion_tokens?: number | null;
	};
	supported_parameters?: string[];
	preferredIndex?: number;
}

interface KiloGatewayModelsResponse {
	data?: KiloGatewayModel[];
}

const DEFAULT_COMPAT: KiloModelConfig["compat"] = {
	maxTokensField: "max_tokens",
	supportsDeveloperRole: false,
	supportsReasoningEffort: false,
	supportsUsageInStreaming: false,
};

const FALLBACK_MODELS: KiloModelConfig[] = [
	{
		id: "kilo/auto",
		name: "Kilo: Auto",
		reasoning: true,
		input: ["text", "image"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 200000,
		maxTokens: 64000,
		compat: DEFAULT_COMPAT,
	},
	{
		id: "anthropic/claude-sonnet-4.5",
		name: "Anthropic: Claude Sonnet 4.5",
		reasoning: true,
		input: ["text", "image"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 200000,
		maxTokens: 64000,
		compat: DEFAULT_COMPAT,
	},
	{
		id: "openai/gpt-5.2-codex",
		name: "OpenAI: GPT-5.2 Codex",
		reasoning: true,
		input: ["text", "image"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 400000,
		maxTokens: 128000,
		compat: DEFAULT_COMPAT,
	},
	{
		id: "google/gemini-3-flash-preview",
		name: "Google: Gemini 3 Flash Preview",
		reasoning: true,
		input: ["text", "image"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 1048576,
		maxTokens: 65535,
		compat: DEFAULT_COMPAT,
	},
	{
		id: "minimax/minimax-m2.5:free",
		name: "MiniMax: M2.5 (free)",
		reasoning: true,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 204800,
		maxTokens: 131072,
		compat: DEFAULT_COMPAT,
	},
];

function asPositiveInt(value: unknown): number | undefined {
	if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
	if (value <= 0) return undefined;
	return Math.floor(value);
}

function resolveContextWindow(model: KiloGatewayModel): number {
	return asPositiveInt(model.context_length) || asPositiveInt(model.top_provider?.context_length) || 128000;
}

function resolveMaxTokens(model: KiloGatewayModel, contextWindow: number): number {
	const providerMax = asPositiveInt(model.top_provider?.max_completion_tokens);
	if (providerMax) return providerMax;
	const estimated = Math.floor(contextWindow / 4);
	return Math.max(4096, Math.min(estimated, 65536));
}

function resolveInputModalities(model: KiloGatewayModel): InputModality[] {
	const input = model.architecture?.input_modalities || [];
	if (input.some((m) => m === "image")) {
		return ["text", "image"];
	}
	return ["text"];
}

function supportsReasoning(model: KiloGatewayModel): boolean {
	const params = model.supported_parameters || [];
	return params.includes("reasoning") || params.includes("include_reasoning");
}

function toModelConfig(model: KiloGatewayModel): KiloModelConfig | undefined {
	const id = model.id?.trim();
	if (!id) return undefined;

	const contextWindow = resolveContextWindow(model);
	const maxTokens = resolveMaxTokens(model, contextWindow);

	return {
		id,
		name: model.name?.trim() || id,
		reasoning: supportsReasoning(model),
		input: resolveInputModalities(model),
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow,
		maxTokens,
		compat: DEFAULT_COMPAT,
	};
}

async function fetchKiloModels(): Promise<KiloModelConfig[]> {
	const response = await fetch(KILO_MODELS_URL, {
		headers: {
			Accept: "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(`failed to fetch models (${response.status})`);
	}

	const payload = (await response.json()) as KiloGatewayModelsResponse;
	const data = payload.data || [];

	const models = data
		.slice()
		.sort((a, b) => {
			const ai = asPositiveInt(a.preferredIndex) ?? Number.MAX_SAFE_INTEGER;
			const bi = asPositiveInt(b.preferredIndex) ?? Number.MAX_SAFE_INTEGER;
			if (ai !== bi) return ai - bi;
			return (a.name || a.id || "").localeCompare(b.name || b.id || "");
		})
		.map(toModelConfig)
		.filter((model): model is KiloModelConfig => Boolean(model));

	if (models.length === 0) {
		throw new Error("gateway returned zero models");
	}

	return models;
}

function registerKiloProvider(pi: ExtensionAPI, models: KiloModelConfig[]): void {
	pi.registerProvider(PROVIDER_NAME, {
		baseUrl: KILO_BASE_URL,
		apiKey: KILO_API_KEY_ENV,
		api: "openai-completions",
		models,
	});
}

export default async function (pi: ExtensionAPI) {
	let models = FALLBACK_MODELS;

	try {
		models = await fetchKiloModels();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.warn(`[kilo-code-provider] model fetch failed, using fallback models: ${message}`);
	}

	registerKiloProvider(pi, models);

	pi.registerCommand("kilo-refresh-models", {
		description: "Refresh Kilo Code model catalog from Kilo Gateway",
		handler: async (_args, ctx) => {
			ctx.ui.notify("Refreshing Kilo Code models...", "info");

			try {
				const refreshedModels = await fetchKiloModels();
				registerKiloProvider(pi, refreshedModels);
				ctx.ui.notify(`Loaded ${refreshedModels.length} Kilo Code models`, "info");
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				ctx.ui.notify(`Failed to refresh Kilo models: ${message}`, "error");
			}
		},
	});
}
