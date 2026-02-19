export function openPrintWindow(title: string, bodyHtml: string) {
  if (typeof window === "undefined") return;
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;

  printWindow.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #0f172a; padding: 24px; }
      h1 { font-size: 20px; margin: 0 0 16px; }
      h2 { font-size: 14px; margin: 16px 0 8px; color: #334155; }
      .meta { font-size: 12px; color: #475569; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; text-align: left; }
      th { background: #f8fafc; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #e2e8f0; font-size: 11px; }
      .section { margin-top: 16px; }
      img { max-width: 100%; height: auto; border-radius: 6px; }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    ${bodyHtml}
  </body>
</html>`);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}
