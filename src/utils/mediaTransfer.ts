interface TransferItemLike {
  kind?: string;
  type?: string;
  getAsFile?: () => File | null;
}

interface TransferDataLike {
  files?: ArrayLike<File> | null;
  items?: ArrayLike<TransferItemLike> | null;
  types?: ArrayLike<string> | null;
}

function toArray<T>(value: ArrayLike<T> | null | undefined): T[] {
  return value ? Array.from(value) : [];
}

function isImageType(value: string | null | undefined): boolean {
  return typeof value === 'string' && /^image\//iu.test(value.trim());
}

export function isImageTransferFile(file: File | null | undefined): file is File {
  return file instanceof File && isImageType(file.type);
}

export function hasTransferText(dataTransfer: TransferDataLike | null | undefined): boolean {
  return toArray(dataTransfer?.types).some((type) => /^text\//iu.test(type.trim()));
}

export function hasTransferFiles(dataTransfer: TransferDataLike | null | undefined): boolean {
  if (toArray(dataTransfer?.types).some((type) => type.trim().toLowerCase() === 'files')) {
    return true;
  }

  return (
    toArray(dataTransfer?.items).some((item) => item.kind === 'file') ||
    toArray(dataTransfer?.files).length > 0
  );
}

export function hasImageTransferFile(dataTransfer: TransferDataLike | null | undefined): boolean {
  return (
    toArray(dataTransfer?.items).some((item) => item.kind === 'file' && isImageType(item.type)) ||
    toArray(dataTransfer?.files).some((file) => isImageTransferFile(file))
  );
}

export function readFirstImageTransferFile(
  dataTransfer: TransferDataLike | null | undefined
): File | null {
  for (const item of toArray(dataTransfer?.items)) {
    if (item.kind !== 'file' || !isImageType(item.type)) {
      continue;
    }

    const file = item.getAsFile?.() ?? null;
    if (isImageTransferFile(file)) {
      return file;
    }
  }

  return toArray(dataTransfer?.files).find(isImageTransferFile) ?? null;
}
