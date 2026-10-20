export interface TextRun { text: string; sanskrit: boolean; bold: boolean }
export function parseMarkup(value: string): TextRun[] {
 const runs: TextRun[] = []; let bold=false;
 for (const part of value.split(/(\*\*|\{\{[\s\S]*?\}\})/g)) {
  if (part==='**') {bold=!bold;continue;}
  if (part) runs.push({text:part.startsWith('{{')?part.slice(2,-2):part,sanskrit:part.startsWith('{{'),bold});
 }
 return runs;
}
