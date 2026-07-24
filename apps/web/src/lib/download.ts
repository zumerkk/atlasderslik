export function downloadDataUri(dataUri: string, filename: string) {
    const a = document.createElement("a");
    a.href = dataUri;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

export function extensionFromDataUri(dataUri: string): string {
    const match = dataUri.match(/^data:([^;]+);/);
    if (!match) return "bin";
    const mime = match[1];
    if (mime.includes("pdf")) return "pdf";
    if (mime.includes("png")) return "png";
    if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
    if (mime.includes("word") || mime.includes("docx")) return "docx";
    return "bin";
}
