"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AtlasSavedPlanResponse } from "@repo/shared";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

type SavedPlan = AtlasSavedPlanResponse;
type ProgressChange = { planId: string; blockId: string; completed: boolean };
type PlanState = SavedPlan & {
    identity: string;
    restoring: boolean;
    planning: boolean;
    pendingBlockId: string | null;
    restoreError: string | null;
    planError: string | null;
    progressError: string | null;
    retryProgress: ProgressChange | null;
    notice: string | null;
};

const EMPTY: Omit<PlanState, "identity"> = {
    plan: null, completedBlockIds: [], updatedAt: null, restoring: false, planning: false,
    pendingBlockId: null, restoreError: null, planError: null, progressError: null,
    retryProgress: null, notice: null,
};

function sameAccount(id: string | null): boolean {
    try {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        return id === String(user?.id || user?._id || user?.email || "");
    } catch { return false; }
}

function readSavedPlan(value: unknown, studentId: string): SavedPlan {
    if (!value || typeof value !== "object") throw new Error("Kayıtlı plan okunamadı. Yeniden deneyebilirsin.");
    const data = value as SavedPlan;
    if (!Array.isArray(data.completedBlockIds) || (data.updatedAt !== null && (typeof data.updatedAt !== "string" || Number.isNaN(Date.parse(data.updatedAt))))) {
        throw new Error("Plan kaydı doğrulanamadı. Yeniden deneyebilirsin.");
    }
    if (data.plan === null) return { plan: null, completedBlockIds: [], updatedAt: data.updatedAt };
    const plan = data.plan;
    if (!plan || typeof plan.id !== "string" || plan.studentId !== studentId || typeof plan.title !== "string"
        || typeof plan.summary !== "string" || typeof plan.createdAt !== "string" || Number.isNaN(Date.parse(plan.createdAt))
        || plan.timezone !== "Europe/Istanbul" || !Number.isFinite(plan.dailyMinutes)
        || !Array.isArray(plan.notes) || !plan.notes.every((note) => typeof note === "string")
        || !Array.isArray(plan.days) || !plan.days.length || !plan.days.every((day) => day && /^\d{4}-\d{2}-\d{2}$/.test(day.date)
            && typeof day.label === "string" && Array.isArray(day.blocks) && day.blocks.every((block) => block && typeof block.id === "string"
                && /^\d{2}:\d{2}$/.test(block.startTime) && /^\d{2}:\d{2}$/.test(block.endTime) && Number.isFinite(block.minutes)
                && ["learn", "practice", "review", "homework", "break"].includes(block.kind)
                && [block.topic, block.subject, block.activity, block.reason].every((text) => typeof text === "string")))) {
        throw new Error("Plan içeriği doğrulanamadı. Yeniden deneyebilirsin.");
    }
    const workIds = new Set(plan.days.flatMap((day) => day.blocks.filter((block) => block.kind !== "break").map((block) => block.id)));
    return { plan, completedBlockIds: [...new Set(data.completedBlockIds.filter((id) => typeof id === "string" && workIds.has(id)))], updatedAt: data.updatedAt };
}

async function readResponse(response: Response, fallback: string): Promise<unknown> {
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(typeof data?.message === "string" ? data.message : fallback);
    return data;
}

/** One mutation at a time prevents an older response from undoing a newer checkmark. */
export function useAtlasStudyPlan(accountId: string | null, studentId: string) {
    const identity = `${accountId || ""}:${studentId}`;
    const identityRef = useRef(identity);
    identityRef.current = identity;
    const request = useRef<AbortController | null>(null);
    const busy = useRef(false);
    const [state, setState] = useState<PlanState>({ ...EMPTY, identity });
    const stateRef = useRef(state);
    stateRef.current = state;

    const isCurrent = useCallback((controller: AbortController) => !controller.signal.aborted
        && request.current === controller && identityRef.current === identity && sameAccount(accountId), [accountId, identity]);

    const restore = useCallback(async (notice: string | null = null) => {
        if (!accountId || !studentId || !sameAccount(accountId)) return;
        request.current?.abort();
        const controller = new AbortController();
        request.current = controller;
        busy.current = true;
        setState((previous) => ({ ...(previous.identity === identity ? previous : { ...EMPTY, identity }), restoring: true, planning: false,
            pendingBlockId: null, restoreError: null, planError: null, progressError: null, retryProgress: null, notice }));
        try {
            const response = await apiGet(`/atlas-ai/saved-plan?studentId=${encodeURIComponent(studentId)}`, { timeout: 30000, retries: 0, signal: controller.signal });
            const saved = readSavedPlan(await readResponse(response, "Kayıtlı planına ulaşılamadı."), studentId);
            if (isCurrent(controller)) setState({ ...EMPTY, ...saved, identity, notice });
        } catch (cause) {
            if (isCurrent(controller)) setState((previous) => ({ ...previous, restoring: false,
                restoreError: cause instanceof Error ? cause.message : "Kayıtlı planın yüklenemedi. Bağlantını kontrol edip yeniden deneyebilirsin." }));
        } finally { if (request.current === controller) busy.current = false; }
    }, [accountId, identity, isCurrent, studentId]);

    useEffect(() => {
        setState({ ...EMPTY, identity, restoring: Boolean(accountId && studentId) });
        void restore();
        return () => { request.current?.abort(); busy.current = false; };
    }, [accountId, identity, restore, studentId]);

    const create = async (dailyMinutes: number, startHour: number) => {
        if (!accountId || !studentId || busy.current || !sameAccount(accountId) || stateRef.current.restoreError) return;
        const controller = new AbortController();
        request.current?.abort();
        request.current = controller;
        busy.current = true;
        setState((previous) => ({ ...previous, planning: true, planError: null, progressError: null, retryProgress: null, notice: null }));
        try {
            const response = await apiPost("/atlas-ai/plan", { studentId, dailyMinutes, startHour }, { timeout: 45000, retries: 0, signal: controller.signal });
            const saved = readSavedPlan(await readResponse(response, "Plan hazırlanıp kaydedilemedi. Yeniden deneyebilirsin."), studentId);
            if (!saved.plan) throw new Error("Hazırlanan plan bulunamadı. Yeniden deneyebilirsin.");
            if (isCurrent(controller)) setState({ ...EMPTY, ...saved, identity, notice: "Yeni planın hesabına kaydedildi." });
        } catch (cause) {
            if (isCurrent(controller)) setState((previous) => ({ ...previous, planning: false,
                planError: cause instanceof Error ? cause.message : "Plan kaydı doğrulanamadı. Yeniden deneyebilirsin." }));
        } finally { if (request.current === controller) busy.current = false; }
    };

    const updateProgress = async (change: ProgressChange) => {
        const current = stateRef.current;
        if (!accountId || !studentId || busy.current || current.identity !== identity || current.plan?.id !== change.planId || !sameAccount(accountId)) return;
        const controller = new AbortController();
        request.current?.abort();
        request.current = controller;
        busy.current = true;
        const previousCompleted = current.completedBlockIds;
        const nextCompleted = change.completed ? [...new Set([...previousCompleted, change.blockId])] : previousCompleted.filter((id) => id !== change.blockId);
        setState((previous) => ({ ...previous, completedBlockIds: nextCompleted, pendingBlockId: change.blockId, progressError: null, retryProgress: null, notice: null }));
        try {
            const response = await apiPatch("/atlas-ai/saved-plan/progress", { studentId, ...change }, { timeout: 20000, retries: 0, signal: controller.signal });
            if (response.status === 409 && isCurrent(controller)) {
                await restore("Planın başka bir oturumda değişti. Güncel planını getirdim; çalışmanı yeniden işaretleyebilirsin.");
                return;
            }
            const saved = readSavedPlan(await readResponse(response, "İlerlemen kaydedilemedi. Yeniden deneyebilirsin."), studentId);
            if (isCurrent(controller)) setState({ ...EMPTY, ...saved, identity });
        } catch (cause) {
            if (isCurrent(controller)) setState((previous) => ({ ...previous, completedBlockIds: previousCompleted, pendingBlockId: null,
                retryProgress: change, progressError: cause instanceof Error ? cause.message : "İlerlemen kaydedilemedi. Yeniden deneyebilirsin." }));
        } finally { if (request.current === controller) busy.current = false; }
    };

    const visible = state.identity === identity ? state : { ...EMPTY, identity, restoring: Boolean(accountId && studentId) };
    return {
        ...visible,
        create,
        restore,
        toggleBlock: (blockId: string) => visible.plan && updateProgress({ planId: visible.plan.id, blockId, completed: !visible.completedBlockIds.includes(blockId) }),
        retrySave: () => visible.retryProgress && updateProgress(visible.retryProgress),
        busy: visible.restoring || visible.planning || visible.pendingBlockId !== null,
    };
}
