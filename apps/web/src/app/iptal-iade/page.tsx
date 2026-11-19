import Link from "next/link";
import { PublicLegalPage, LegalSection } from "@/components/legal/public-legal-page";
import { ContactChannels } from "@/components/legal/contact-channels";
import { LEGAL_SOURCES } from "@/lib/legal-documents";

export const metadata = { title: "Teslimat, İptal ve İade" };

export default function RefundPage() {
  return <PublicLegalPage document="refund" intro="Dijital ders erişiminin teslimi, sipariş sorunları ve iptal/iade başvuruları.">
    <LegalSection title="Dijital teslimat"><p>Paketler çevrim içi hizmettir; kargo ve fiziksel gönderim yoktur. Doğrulanmış ödeme ve öğrenciye sınıf kaydının tamamlanması sonrasında erişim açılır. Siparişte ödeme doğrulandığı hâlde erişim açılamıyorsa sipariş numaranızla bize yazın. Erişim süresi ve sınıflar, satın aldığınız pakete göre belirlenir.</p></LegalSection>
    <LegalSection title="Cayma bildirimi"><p>Yasal istisnalar dışında, hizmet sözleşmesinin kurulduğu tarihten itibaren 14 gün içinde gerekçe göstermeden ve cezai şart olmadan cayabilirsiniz. Cayma bildiriminizi aşağıdaki e-posta adresine veya yukarıdaki sağlayıcı adresine yazılı olarak iletebilirsiniz. Sipariş panelindeki iade talebi seçeneği de kullanılabilir; belirli bir form kullanmak zorunlu değildir.</p><p>Bildiriminizde adınız, kayıtlı e-posta adresiniz, sipariş numaranız ve cayma/iptal talebinizin bulunması işlemin eşleştirilmesini kolaylaştırır. Kart numarası, CVV veya hesap şifrenizi göndermeyin. Telefonla bilgi alabilirsiniz; cayma bildiriminizi ayrıca yazılı iletin.</p></LegalSection>
    <ContactChannels />
    <LegalSection title="Hizmet başladıysa"><p>Anında ifa edilen elektronik hizmetlerde ve tüketicinin onayıyla cayma süresi içinde ifasına başlanan hizmetlerde kanuni istisnalar söz konusu olabilir. Sadece hesabın açılması veya genel şartların kabul edilmesi gerekçesiyle tüm iadelerin reddedileceği bir kural uygulanmaz. Talep, satın alınan hizmet ve ilgili onay/teslim kayıtları üzerinden değerlendirilir. Ayıplı veya hiç sunulmayan hizmete ilişkin haklarınız saklıdır.</p></LegalSection>
    <LegalSection title="İade süreci"><p>Geçerli cayma bildirimi üzerine hizmet sözleşmesine ilişkin geri ödeme, bildirimin ulaşmasından itibaren en geç 14 gün içinde, satın almada kullanılan ödeme aracına uygun biçimde ve tüketiciye ek masraf yüklenmeden yapılır. Bankanın karta yansıtma zamanı farklı olabilir. İade talebinin oluşturulması, ödemenin iade edildiği anlamına gelmez; işlem sonucu ayrıca takip edilmelidir.</p><p>Bekleyen veya başarısız ödeme için önce sipariş durumunu kontrol edin. Otomatik yenileme olmadığından bir sonraki dönem tahsilatını durdurmak için abonelik kapatma işlemi gerekmez.</p></LegalSection>
    <LegalSection title="Çözüm ve kanuni yollar"><p>Talebinizle ilgili açıklama ve belgeleri <Link href="/iletisim">destek kanallarımıza</Link> iletebilirsiniz. Kanuni tüketici hakları ve yetkili tüketici hakem heyeti/mahkemesine başvuru imkânı saklıdır.</p><p>Kaynak: <a href={LEGAL_SOURCES.distanceSales} target="_blank" rel="noopener noreferrer">Ticaret Bakanlığı cayma ve iade bilgilendirmesi</a>.</p></LegalSection>
  </PublicLegalPage>;
}
