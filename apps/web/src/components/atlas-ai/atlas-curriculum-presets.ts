// Reviewed source excerpts. Filling a form never saves or approves an entry.
const sourceDrafts = [
  {
    "key": "grade8-science-weather",
    "match": {
      "gradeLevel": 8,
      "subjectName": "Fen Bilimleri",
      "topicName": "İklim ve Hava Durumu"
    },
    "officialTopicName": "İklim ve Hava Hareketleri",
    "payload": {
      "schoolYear": "2026-2027",
      "version": "MEB-FEN-2018",
      "program": "PREVIOUS",
      "sourceUrl": "https://mufredat.meb.gov.tr/Dosyalar/201812312311937-FEN%20B%C4%B0L%C4%B0MLER%C4%B0%20%C3%96%C4%9ERET%C4%B0M%20PROGRAMI2018.pdf",
      "sourceTitle": "MEB Fen Bilimleri Dersi Öğretim Programı (3–8. sınıflar), Ankara 2018",
      "sourceLocator": "Basılı s. 47; PDF s. 49/58; F.8.1.2.1 ve F.8.1.2.2",
      "outcomes": [
        {
          "code": "F.8.1.2.1",
          "text": "İklim ve hava olayları arasındaki farkı açıklar."
        },
        {
          "code": "F.8.1.2.2",
          "text": "İklim biliminin (klimatoloji) bir bilim dalı olduğunu ve bu alanda çalışan uzmanlara iklim bilimci (klimatolog) adı verildiğini söyler."
        }
      ]
    }
  },
  {
    "key": "grade8-science-liquid-pressure",
    "match": {
      "gradeLevel": 8,
      "subjectName": "Fen Bilimleri",
      "topicName": "Sıvılarda Basınç"
    },
    "officialTopicName": "Basınç",
    "payload": {
      "schoolYear": "2026-2027",
      "version": "MEB-FEN-2018",
      "program": "PREVIOUS",
      "sourceUrl": "https://mufredat.meb.gov.tr/Dosyalar/201812312311937-FEN%20B%C4%B0L%C4%B0MLER%C4%B0%20%C3%96%C4%9ERET%C4%B0M%20PROGRAMI2018.pdf",
      "sourceTitle": "MEB Fen Bilimleri Dersi Öğretim Programı (3–8. sınıflar), Ankara 2018",
      "sourceLocator": "Basılı s. 49; PDF s. 51/58; F.8.3.1.2 ve a–c açıklamaları",
      "outcomes": [
        {
          "code": "F.8.3.1.2",
          "text": "Sıvı basıncını etkileyen değişkenleri tahmin eder ve tahminlerini test eder.\na. Gazların da sıvılara benzer şekilde basınç uyguladıkları belirtilir. Açık hava basıncı örneklendirilir.\nb. Matematiksel bağıntılara girilmez.\nc. Gaz basıncını etkileyen değişkenlere girilmez."
        }
      ]
    }
  }
] as const;

export function atlasCurriculumPreset(subjectName: string, gradeLevel: number, topicName: string, schoolYear: string, expectedProgram?: string) {
    return sourceDrafts.find(draft => draft.match.subjectName === subjectName
        && draft.match.gradeLevel === gradeLevel && draft.match.topicName === topicName
        && draft.payload.schoolYear === schoolYear && draft.payload.program === expectedProgram);
}
