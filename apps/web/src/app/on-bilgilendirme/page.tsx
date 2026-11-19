import Link from "next/link";
import { PublicLegalPage, LegalSection } from "@/components/legal/public-legal-page";
import { LEGAL_SOURCES, PACKAGE_ACCESS_DESCRIPTIONS } from "@/lib/legal-documents";

export const metadata = { title: "Ön Bilgilendirme" };

export default function PreInformationPage() {
  return <PublicLegalPage document="preInformation" intro="Ödeme yükümlülüğü altına girmeden önce hizmeti, toplam bedeli ve haklarınızı inceleyin.">
    <LegalSection title="Sağlayıcı ve iletişim"><p>Hizmeti sağlayan işletmenin ticari unvanı, vergi bilgileri, açık adresi ve iletişim kanalları yukarıdadır. Soru ve bildirimler için <Link href="/iletisim">İletişim</Link> sayfasındaki e-posta veya telefon kullanılabilir.</p></LegalSection>
    <LegalSection title="Satın alınan hizmet"><p>Atlas Derslik fiziksel ürün değil, çevrim içi eğitim erişimi sunar. Hizmetin temel nitelikleri, dâhil olan özellikler ve sınıf kapsamı seçilen <Link href="/packages">paketin detayında</Link> yer alır. Ödeme öncesi sepette paket, hizmetten yararlanacak öğrenci, süre ve toplam fiyat birlikte gösterilir. Öğrencinin sınıfı paket kapsamına uygun olmalıdır.</p></LegalSection>
    <LegalSection title="Toplam bedel ve ödeme"><p>Gösterilen sepet toplamı vergiler dâhil Türk lirası tutarıdır. Fiziksel teslimat ve kargo ücreti yoktur. Mevcut kart ödeme akışı tek çekimdir. Otomatik yenileme, abonelik tahsilatı veya kendiliğinden sonraki dönem satın alımı yapılmaz.</p><p>Ödeme adımının tamamlanması ödeme yükümlülüğü doğurur. Sipariş durumu doğrulanmadan yalnızca tarayıcıda görülen bir başarı mesajına dayanarak erişim açılmaz.</p></LegalSection>
    <LegalSection title="Teslim ve süre"><p>Dijital hizmet, doğrulanmış ödeme ve öğrenciye sınıf erişimi atanması sonrasında hesap üzerinden sunulur. İşlem durumu sipariş ekranında görülür; erişim açılmadığında sipariş numarasıyla destek istenebilir.</p><ul>{Object.values(PACKAGE_ACCESS_DESCRIPTIONS).map(text => <li key={text}>{text}</li>)}</ul><p>Canlı derslere katılım için internet bağlantısı, ses/görüntü desteği olan cihaz ve ilgili ders bağlantısının çalışabileceği yazılım gerekir. Ders saatleri öğrencinin programında gösterilir.</p></LegalSection>
    <LegalSection title="Cayma ve başvuru"><p>Cayma hakkı, yasal istisnalar saklı kalmak üzere, hizmet sözleşmesinin kurulmasından başlayarak 14 gün içinde gerekçesiz ve cezai şart olmadan kullanılabilir. Bildirim ve iade ayrıntıları <Link href="/iptal-iade">iptal/iade sayfasında</Link>; diğer satış koşulları <Link href="/mesafeli-satis-sozlesmesi">mesafeli satış sözleşmesindedir</Link>.</p><p>Bu metni görüntülemek veya gizlilik bildirimini okumak, hizmetin hemen başlaması için ayrı bir onay ya da kanuni haklardan vazgeçme anlamına gelmez. Kanuni tüketici başvuru yolları saklıdır.</p><p>Kaynak: <a href={LEGAL_SOURCES.consumerLaw} target="_blank" rel="noopener noreferrer">Ticaret Bakanlığı tüketici mevzuatı</a>.</p></LegalSection>
  </PublicLegalPage>;
}
