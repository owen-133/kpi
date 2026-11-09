// The two browser calls behind a chosen logo file (legacy FileReader and Image checks). Exercised by the browser run, not by node tests.
export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(Error('파일을 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
}

export function checkImageDecodes(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(Error('유효한 이미지 파일을 선택하세요.'));
    img.src = url;
  });
}
