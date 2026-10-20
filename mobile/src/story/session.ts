// Navigation intent stays local; lesson API identifiers and payloads remain unchanged.
const testOuts=new Set<string>();
export function startTestOut(lessonId:string){testOuts.add(lessonId);}
export function consumeTestOut(lessonId:string){const value=testOuts.has(lessonId);testOuts.delete(lessonId);return value;}
