export type ApiRequestStatus = "requesting" | "waking-server";

export interface ApiErrorData {
	status: number | null;
	code: string;
	validationMessages: string[];
}

export class ApiError extends Error implements ApiErrorData {
	constructor(
		message: string,
		readonly status: number | null,
		readonly code: string,
		readonly validationMessages: string[] = [],
	) {
		super(message);
		this.name = "ApiError";
	}
}

interface ApiRequestOptions extends RequestInit {
	timeoutMs?: number;
	wakeUpAfterMs?: number;
	onStatusChange?: (status: ApiRequestStatus) => void;
}

const DEFAULT_TIMEOUT_MS = 65_000;
const DEFAULT_WAKE_UP_AFTER_MS = 3_500;

export async function apiFetch<T>(
	path: string,
	options: ApiRequestOptions = {},
): Promise<T> {
	const {
		timeoutMs = DEFAULT_TIMEOUT_MS,
		wakeUpAfterMs = DEFAULT_WAKE_UP_AFTER_MS,
		onStatusChange,
		...requestOptions
	} = options;
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	const wakeUpNotice = setTimeout(
		() => onStatusChange?.("waking-server"),
		wakeUpAfterMs,
	);

	try {
		const requestUrl =
			typeof window !== "undefined" && path.startsWith("/api/")
				? normalizePath(path)
				: `${getApiBaseUrl()}${normalizePath(path)}`;
		const response = await fetch(requestUrl, {
			...requestOptions,
			signal: controller.signal,
			headers: {
				Accept: "application/json",
				...requestOptions.headers,
			},
		});
		const payload = await readResponseBody(response);

		if (!response.ok) {
			throw normalizeApiError(response.status, payload);
		}

		return payload as T;
	} catch (error) {
		if (error instanceof ApiError) throw error;

		if (controller.signal.aborted) {
			throw new ApiError(
				"O servidor demorou para responder. Tente novamente.",
				null,
				"timeout",
			);
		}

		throw new ApiError(
			"Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
			null,
			"network",
		);
	} finally {
		clearTimeout(timeout);
		clearTimeout(wakeUpNotice);
	}
}

function getApiBaseUrl(): string {
	const baseUrl =
		typeof window === "undefined"
			? process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL
			: process.env.NEXT_PUBLIC_API_URL;

	return (baseUrl || "http://localhost:8080").replace(/\/+$/, "");
}

function normalizePath(path: string): string {
	return path.startsWith("/") ? path : `/${path}`;
}

async function readResponseBody(response: Response): Promise<unknown> {
	if (response.status === 204) return null;

	const contentType = response.headers.get("content-type") ?? "";
	if (!contentType.includes("json")) {
		return response.text();
	}

	try {
		return await response.json();
	} catch {
		return null;
	}
}

function normalizeApiError(status: number, payload: unknown): ApiError {
	const body = isRecord(payload) ? payload : {};
	const validationMessages = extractValidationMessages(body);
	const message =
		validationMessages[0] ??
		firstString(body, ["detail", "message", "title", "error"]) ??
		"Não foi possível gerar o roteiro. Tente novamente.";

	return new ApiError(message, status, "http", validationMessages);
}

function extractValidationMessages(body: Record<string, unknown>): string[] {
	const errors = body.errors;
	if (!Array.isArray(errors)) return [];

	return errors.flatMap((error) => {
		if (typeof error === "string") return [error];
		if (!isRecord(error)) return [];

		const message = firstString(error, ["defaultMessage", "message", "error"]);
		const field = firstString(error, ["field", "objectName"]);
		return message ? [field ? `${field}: ${message}` : message] : [];
	});
}

function firstString(
	body: Record<string, unknown>,
	keys: string[],
): string | undefined {
	for (const key of keys) {
		const value = body[key];
		if (typeof value === "string" && value.trim()) return value;
	}
	return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
