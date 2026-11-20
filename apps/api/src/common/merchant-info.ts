import type { ConfigService } from '@nestjs/config';

/** Public business identity only. API keys, buyer data and bank details never belong here. */
export function merchantInfo(config: Pick<ConfigService, 'get'>) {
    const read = (key: string) => String(config.get(key) || '').trim();
    const info = {
        brand: 'Atlas Derslik',
        title: read('MERCHANT_TITLE'),
        taxNumber: read('MERCHANT_TAX_NUMBER'),
        taxOffice: read('MERCHANT_TAX_OFFICE'),
        address: read('MERCHANT_ADDRESS'),
        email: read('MERCHANT_EMAIL'),
        phone: read('MERCHANT_PHONE'),
    };
    const checks = {
        title: info.title.length >= 2 && info.title.length <= 160,
        taxNumber: /^\d{10,11}$/.test(info.taxNumber),
        taxOffice: info.taxOffice.length >= 2 && info.taxOffice.length <= 100,
        address: info.address.length >= 10 && info.address.length <= 500,
        email: info.email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email),
        phone: /^\+90[1-9]\d{9}$/.test(info.phone),
    };
    return { ...info, complete: Object.values(checks).every(Boolean) };
}
