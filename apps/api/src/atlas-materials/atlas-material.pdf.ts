import PDFDocument = require('pdfkit');
import { resolve } from 'node:path';
import { Readable } from 'node:stream';
import type { AtlasMaterial, AtlasMaterialContent } from './atlas-material.schema';
import { hasAtlasInstructionOverride } from '../atlas-ai/atlas-ai.curriculum.service';

const INK = '#142b42', TEAL = '#0f766e', GRAY = '#536478';
const safe = (text: string) => text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/\r\n/g, '\n');

/** One branded, embedded-font A4 template; no HTML or remote assets. */
export function renderAtlasMaterialPdf(material: Pick<AtlasMaterial, 'kind' | 'content' | 'curriculum'>, createdAt = new Date(), preview = false): Promise<Buffer> {
  return new Promise((resolveBuffer, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 110, bottom: 70, left: 48, right: 48 }, bufferPages: true,
      info: { Title: safe(material.content.title), Author: 'Atlas Derslik', Creator: 'AtlasAI / atlas-a4-v1', Subject: material.curriculum.topic } });
    const buffers: Buffer[] = [];
    doc.on('data', chunk => buffers.push(chunk)); doc.on('error', reject); doc.on('end', () => resolveBuffer(Buffer.concat(buffers)));
    const assets = resolve(__dirname, '../../assets/pdf');
    try {
      doc.registerFont('Atlas', resolve(assets, 'AtlasSans-Regular.ttf'));
      doc.registerFont('AtlasBold', resolve(assets, 'AtlasSans-Bold.ttf'));
      const paintPage = () => {
        doc.save();
        doc.rect(0, 0, doc.page.width, 82).fill(INK);
        doc.circle(70, 41, 27).fill('#f1f7f8');
        doc.image(resolve(assets, 'atlas-logo.png'), 48, 20, { fit: [44, 43] });
        doc.font('AtlasBold').fontSize(20).fillColor('#ffffff').text('ATLAS DERSLİK', 112, 22, { lineBreak: false });
        doc.font('Atlas').fontSize(10).fillColor('#a8c5d4').text('Öğren. Uygula. Bir adım ileri.', 113, 49, { lineBreak: false });
        doc.strokeColor('#22b8a6').lineWidth(3).moveTo(0, 83).lineTo(doc.page.width, 83).stroke();
        doc.opacity(0.045).image(resolve(assets, 'atlas-logo.png'), 185, 325, { fit: [225, 225] });
        doc.restore(); doc.font('Atlas').fontSize(11).fillColor(INK); doc.x = 48; doc.y = 110;
      };
      paintPage(); doc.on('pageAdded', paintPage);
      const ensure = (height: number) => { if (doc.y + height > doc.page.height - 74) doc.addPage(); };
      const heading = (text: string, size = 16) => { ensure(70); doc.moveDown(0.65).font('AtlasBold').fontSize(size).fillColor(TEAL).text(safe(text)); doc.moveDown(0.35).font('Atlas').fontSize(11).fillColor(INK); };
      const paragraph = (text: string, color = INK) => { doc.font('Atlas').fontSize(11).fillColor(color).text(safe(text), { width: 499, lineGap: 4 }); doc.moveDown(0.55); };
      doc.font('AtlasBold').fontSize(9).fillColor(TEAL).text(`${material.curriculum.gradeLevel}. SINIF  /  ${material.curriculum.subject.toLocaleUpperCase('tr-TR')}  /  ${material.kind === 'worksheet' ? 'ÇALIŞMA KÂĞIDI' : 'KONU ANLATIMI'}`);
      doc.moveDown(0.65).font('AtlasBold').fontSize(25).fillColor(INK).text(safe(material.content.title), { lineGap: 2 });
      doc.moveDown(0.35).font('Atlas').fontSize(10).fillColor(GRAY).text(`${material.curriculum.schoolYear} · ${material.curriculum.version} · ${createdAt.toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })}`);
      doc.moveDown(1); paragraph(material.content.introduction);
      heading('Bu materyaldeki kazanımlar', 13);
      for (const outcome of material.curriculum.outcomes) paragraph(`${outcome.code} - ${outcome.text}`, GRAY);
      for (const section of material.content.sections) { heading(section.title); paragraph(section.body); }
      if (material.content.questions.length) {
        if (material.kind === 'worksheet') doc.addPage();
        heading('Şimdi sıra sende');
        material.content.questions.forEach((question, index) => {
          ensure(95); doc.font('AtlasBold').fontSize(12).fillColor(INK).text(`${index + 1}. soru`); doc.moveDown(0.3); paragraph(question.question);
          ensure(42); for (let row = 0; row < (material.kind === 'worksheet' ? 3 : 2); row++) { doc.strokeColor('#d9e4eb').lineWidth(0.5).moveTo(48, doc.y + 10).lineTo(547, doc.y + 10).stroke(); doc.y += 20; }
          doc.moveDown(0.5);
        });
        doc.addPage(); heading('Cevaplar ve çözüm ipuçları', 20);
        material.content.questions.forEach((question, index) => { heading(`${index + 1}. sorunun cevabı`, 13); paragraph(question.answer); paragraph(question.explanation, GRAY); });
      }
      heading('Kaynak ve kullanım notu', 13);
      paragraph(`${material.curriculum.sourceTitle}\n${material.curriculum.sourceUrl}`, GRAY);
      paragraph(preview ? 'Bu dosya yalnızca AtlasAI şablonunun tasarım önizlemesidir. Müfredat onaylı bir materyal veya resmî MEB yayını değildir.' : 'AtlasAI tarafından onaylı müfredat kazanımları kapsamında hazırlanmış öğrenme desteğidir. Öğretmen kontrolü önerilir. Bu belge resmî MEB yayını değildir.', GRAY);
      const pages = doc.bufferedPageRange();
      // Footer must not trigger flowing text beyond the page's bottom margin.
      for (let page = 0; page < pages.count; page++) {
        doc.switchToPage(page); doc.save(); const y = doc.page.height - 45;
        doc.strokeColor('#d9e4eb').lineWidth(0.7).moveTo(48, y - 10).lineTo(547, y - 10).stroke();
        doc.font('Atlas').fontSize(8).fillColor(GRAY).text('atlasderslik.com · AtlasAI öğrenme materyali', 48, y, { lineBreak: false });
        doc.text(`${page + 1} / ${pages.count}`, 493, y, { lineBreak: false }); doc.restore();
      }
      doc.end();
    } catch (error) { (doc as unknown as Readable).destroy(); reject(error); }
  });
}

export function exactAtlasMaterialKeys(value: unknown, keys: string[]): boolean {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

export function validateAtlasMaterialContent(value: unknown, outcomeIds: string[]): value is AtlasMaterialContent {
  if (!exactAtlasMaterialKeys(value, ['title', 'introduction', 'sections', 'questions'])) return false;
  const item = value as AtlasMaterialContent;
  const text = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= max
    && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\p{Cf}]/u.test(value)
    && !/https?:\/\/|\bwww\./iu.test(value) && !hasAtlasInstructionOverride(value);
  const refs = (ids: unknown) => Array.isArray(ids) && ids.length > 0 && ids.length <= 12
    && new Set(ids).size === ids.length && Array.from(ids).every(id => typeof id === 'string' && outcomeIds.includes(id));
  return text(item.title, 140) && text(item.introduction, 1500)
    && Array.isArray(item.sections) && item.sections.length >= 1 && item.sections.length <= 8
    && Array.from(item.sections).every(s => exactAtlasMaterialKeys(s, ['title', 'body', 'outcomeIds']) && text(s.title, 140) && text(s.body, 3500) && refs(s.outcomeIds))
    && Array.isArray(item.questions) && item.questions.length >= 1 && item.questions.length <= 10
    && Array.from(item.questions).every(q => exactAtlasMaterialKeys(q, ['question', 'answer', 'explanation', 'outcomeIds']) && text(q.question, 1200) && text(q.answer, 800) && text(q.explanation, 1800) && refs(q.outcomeIds))
    && JSON.stringify(item).length <= 50000;
}
