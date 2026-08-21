import { z } from "zod";
export const externalReferenceSchema=z.string().min(1).max(128).regex(/^[A-Za-z0-9:_-]+$/);
export function externalReferenceDisposition(existing:string|undefined,incoming:string){return !existing?"CREATE" as const:existing===incoming?"REUSE" as const:"CONFLICT" as const;}
export function externalReferenceOwnershipDisposition(input:{currentReference?:string;incoming:string;applicationId:string;ownerApplicationId?:string}){return input.ownerApplicationId?input.ownerApplicationId===input.applicationId?"REUSE" as const:"CONFLICT" as const:externalReferenceDisposition(input.currentReference,input.incoming);}
