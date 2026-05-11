import legacyPdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

let workerConfigured = false;

type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

function ensurePromiseWithResolvers(): void {
  if (!Promise.withResolvers) {
    Promise.withResolvers = function withResolvers<T>() {
      let resolve!: (value: T | PromiseLike<T>) => void;
      let reject!: (reason?: unknown) => void;
      const promise = new Promise<T>((innerResolve, innerReject) => {
        resolve = innerResolve;
        reject = innerReject;
      });

      return { promise, resolve, reject };
    };
  }
}

async function loadPdfJs(): Promise<PdfJsModule> {
  ensurePromiseWithResolvers();
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  if (!workerConfigured) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = legacyPdfWorker;
    workerConfigured = true;
  }

  return pdfjsLib;
}

/**
 * Extract plain text from a PDF file in the browser (best-effort; layout may be imperfect).
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const parts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((item) => ('str' in item && typeof item.str === 'string' ? item.str : ''))
      .filter(Boolean)
      .join(' ');
    parts.push(line);
  }

  return parts.join('\n\n').replace(/\s+\n/g, '\n').trim();
}
