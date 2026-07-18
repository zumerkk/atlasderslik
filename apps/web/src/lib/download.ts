// Data URI'leri Blob'a çevirerek indirir.
// iOS Safari data: URI + download attribute kombinasyonunu desteklemez (sessizce başarısız olur);
// blob: URL ile tarayıcı native indirme diyaloğunu gösterir.
export function downloadDataUri(dataUri: string, filename: string) {
    try {
        const commaIdx = dataUri.indexOf(",");
        const meta = dataUri.slice(0, commaIdx);
        const payload = dataUri.slice(commaIdx + 1);
        const mime = meta.match(/^data:([^;]+)/)?.[1] || "application/octet-stream";

        let blob: Blob;
        if (meta.includes("base64")) {
            const bin = atob(payload);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            blob = new Blob([bytes], { type: mime });
        } else {
            blob = new Blob([decodeURIComponent(payload)], { type: mime });
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
        // Son çare: yeni sekmede açmayı dene
        window.open(dataUri, "_blank");
    }
}

export function extensionFromDataUri(dataUri: string): string {
    const mime = dataUri.match(/^data:([^;,]+)/)?.[1] || "";
    if (mime.includes("pdf")) return "pdf";
    if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
    if (mime.includes("png")) return "png";
    if (mime.includes("wordprocessingml")) return "docx";
    if (mime.includes("msword")) return "doc";
    return mime.split("/")[1] || "dat";
}
