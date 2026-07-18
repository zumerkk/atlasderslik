// Data URI'leri Blob'a çevirerek indirir / görüntüler.
//
// Neden data URI doğrudan kullanılmıyor:
// - iOS Safari data: URI + download attribute kombinasyonunu desteklemez;
//   data: URI'ye gezinme de engellendiği için sonuç boş/siyah ekrandır.
// - blob: URL her platformda çalışır.
//
// iOS'ta indirme diyaloğu yerine dosyayı yeni sekmede GÖRÜNTÜLERİZ:
// Safari (ve WhatsApp/Instagram içi tarayıcılar) PDF/görseli inline gösterir,
// kullanıcı paylaş menüsünden kaydedebilir. Diğer platformlarda normal indirme.

function isIOS(): boolean {
    if (typeof navigator === "undefined") return false;
    return (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        // iPadOS 13+ kendini masaüstü Mac olarak tanıtır
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
}

function dataUriToBlob(dataUri: string): Blob {
    const commaIdx = dataUri.indexOf(",");
    const meta = dataUri.slice(0, commaIdx);
    const payload = dataUri.slice(commaIdx + 1);
    const mime = meta.match(/^data:([^;]+)/)?.[1] || "application/octet-stream";

    if (meta.includes("base64")) {
        const bin = atob(payload);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new Blob([bytes], { type: mime });
    }
    return new Blob([decodeURIComponent(payload)], { type: mime });
}

export function downloadDataUri(dataUri: string, filename: string) {
    try {
        const blob = dataUriToBlob(dataUri);
        const url = URL.createObjectURL(blob);

        if (isIOS()) {
            // Yeni sekmede görüntüle; popup engellenirse (in-app webview) aynı sekmede aç
            const win = window.open(url, "_blank");
            if (!win) window.location.assign(url);
        } else {
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
        // Son çare: tarayıcı ne yapabiliyorsa
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
