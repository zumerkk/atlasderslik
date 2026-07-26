export function dataUriToBlob(dataUri: string): Blob {
    try {
        const parts = dataUri.split(",");
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    } catch {
        return new Blob([], { type: "application/octet-stream" });
    }
}

export function openDataUriInNewTab(dataUri: string) {
    if (!dataUri) return;
    try {
        const blob = dataUriToBlob(dataUri);
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, "_blank");
        if (!win) {
            window.location.href = blobUrl;
        }
    } catch {
        window.open(dataUri, "_blank");
    }
}

export function downloadDataUri(dataUri: string, filename: string) {
    if (!dataUri) return;

    // Detect iOS / iPadOS (Safari on iPhone, iPad, iPod)
    const isIOS = typeof navigator !== "undefined" && (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (typeof navigator.platform === "string" && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );

    try {
        const blob = dataUriToBlob(dataUri);
        const blobUrl = URL.createObjectURL(blob);

        if (isIOS) {
            // iOS Safari restricts <a download> for base64 data: URIs.
            // Opening Blob URL in a new tab allows iOS Safari to display the PDF/Image natively
            // with native "Save to Files" / Share sheet!
            const win = window.open(blobUrl, "_blank");
            if (!win) {
                window.location.href = blobUrl;
            }
        } else {
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
        }
    } catch (e) {
        console.error("Download fallback to open in new tab:", e);
        openDataUriInNewTab(dataUri);
    }
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
