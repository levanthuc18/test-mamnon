import { sSet } from "./storage";

export let CURRENT_ACTOR = "Admin";

export function setActor(actor: string) {
  CURRENT_ACTOR = actor;
}

export async function logAction(act: string) {
  try {
    const log = ((await import("./storage")).sGet)("mn5:log") as Promise<any[]>;
    const arr = (await log) || [];
    arr.unshift({ t: new Date().toISOString(), who: CURRENT_ACTOR, act });
    if (arr.length > 800) arr.length = 800;
    await sSet("mn5:log", arr);
  } catch {}
}
