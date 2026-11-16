  if (window.pdfjsLib) return resolve(window.pdfjsLib);
  const s = document.createElement('script');
  s.src = PDFJS_BASE + 'pdf.min.js';
  s.onload = () => {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_BASE + 'pdf.worker.min.js';
    resolve(window.pdfjsLib);
  };
  s.onerror = () => reject(new Error('pdfjs'));
  document.head.appendChild(s);
});

export const readPdfPages = async (buf) => {
  const lib = await loadPdfJs();
  const pdf = await lib.getDocument({ data: new Uint8Array(buf) }).promise;
  const pages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const content = await (await pdf.getPage(p)).getTextContent();
    pages.push(content.items.map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5] })));
  }
  return pages;
};
