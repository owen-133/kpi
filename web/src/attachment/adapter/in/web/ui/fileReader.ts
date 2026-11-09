/** The base64 part of a data URL (legacy `String(r.result).split(',')[1]`). */
export function dataUrlBase64(dataUrl: string): string {
  return dataUrl.split(',')[1];
}

/** Reads a File with FileReader (browser only). A read error rejects with the progress event, as in the legacy code. */
export function readFileAsBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(dataUrlBase64(String(reader.result)));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
