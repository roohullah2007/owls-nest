/**
 * Tiny fetch wrapper used across the CRM for JSON API calls.
 *
 * Wraps the boilerplate of CSRF headers + JSON content type + redirect
 * handling. Two flavors:
 *
 *   apiFetch(path, init?)     — generic; pass any method, returns parsed JSON
 *   apiPost(path, body?)      — POST JSON body, returns parsed JSON
 *   apiSubmit(path, body)     — POST JSON to an Inertia/redirect endpoint and
 *                                ignore the 302 (used for endpoints that
 *                                return RedirectResponse like notes/tasks)
 *
 * All three throw on non-2xx with a message extracted from the response body.
 */

function csrfToken(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

const BASE_HEADERS = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
};

export async function apiFetch(path: string, init: RequestInit = {}): Promise<any> {
    const res = await fetch(path, {
        ...init,
        headers: { ...BASE_HEADERS, 'X-CSRF-TOKEN': csrfToken(), ...(init.headers ?? {}) },
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? body.error ?? `Request failed (${res.status})`);
    }
    return res.json();
}

export function apiPost(path: string, body?: object): Promise<any> {
    return apiFetch(path, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
    });
}

export function apiPatch(path: string, body?: object): Promise<any> {
    return apiFetch(path, {
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined,
    });
}

export function apiPut(path: string, body?: object): Promise<any> {
    return apiFetch(path, {
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
    });
}

export function apiDelete(path: string): Promise<any> {
    return apiFetch(path, { method: 'DELETE' });
}

/**
 * For endpoints that return RedirectResponse (Inertia-style controllers like
 * NoteController, TaskController). We don't want fetch to follow the 302 into
 * a full HTML page, so we use redirect: 'manual' and treat opaqueredirect as
 * success too.
 */
export async function apiSubmit(path: string, body: object): Promise<void> {
    const res = await fetch(path, {
        method: 'POST',
        redirect: 'manual',
        headers: { ...BASE_HEADERS, 'X-CSRF-TOKEN': csrfToken() },
        body: JSON.stringify(body),
    });
    if (!res.ok && res.type !== 'opaqueredirect') {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? data.error ?? `Request failed (${res.status})`);
    }
}
