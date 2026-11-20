"use client";

import Markdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { safeAtlasHref } from "./atlas-ai-provider";
import styles from "./atlas-ai.module.css";

function normalizeMathDelimiters(content: string) {
    // Keep examples inside code unchanged while accepting both common math delimiters.
    return content.split(/(```[\s\S]*?```|`[^`\n]*`)/g).map((part, index) => index % 2 ? part : part
        .replace(/\\\[([\s\S]*?)\\\]/g, (_, formula: string) => `\n$$\n${formula.trim()}\n$$\n`)
        .replace(/\\\(([^\n]*?)\\\)/g, (_, formula: string) => `$${formula}$`)).join("");
}

export function AtlasReply({ content, role }: { content: string; role: string }) {
    return <div className={styles.replyText}><Markdown
        skipHtml
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { trust: false, strict: "ignore", maxExpand: 500, maxSize: 12 }]]}
        urlTransform={(url, key) => {
            if (key !== "href") return "";
            return url.startsWith("/") ? safeAtlasHref(url, role) || "" : defaultUrlTransform(url);
        }}
        components={{
            a: ({ href, children }) => href ? <a href={href} target={href.startsWith("/") || href.startsWith("#") ? undefined : "_blank"} rel="noopener noreferrer">{children}</a> : <span>{children}</span>,
            img: ({ alt }) => alt ? <span>{alt}</span> : null,
            table: ({ children }) => <div className={styles.replyTable} role="region" aria-label="Yanıttaki tablo" tabIndex={0}><table>{children}</table></div>,
        }}
    >{normalizeMathDelimiters(content)}</Markdown></div>;
}
