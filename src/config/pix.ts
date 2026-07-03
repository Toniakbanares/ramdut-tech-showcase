// Configuração PIX — edite a chave aqui (chave PIX real do seu banco).
// Pode ser CPF, e-mail, celular (+55...) ou aleatória (UUID).
// O VITE_PIX_KEY do .env tem prioridade se existir.
export const PIX_KEY: string =
  (import.meta.env.VITE_PIX_KEY as string | undefined) ||
  'protonramdut2026@proton.me';

export const PIX_MERCHANT_NAME = 'JAQUES DUTRA';
export const PIX_MERCHANT_CITY = 'NOVO HAMBURGO';
export const PIX_AMOUNT = 0; // R$ 0 = valor livre (usuário escolhe no app do banco)
export const PIX_DESCRIPTION = 'Cafe pro Ramu';

// Gera string EMV BR Code (PIX copia-e-cola) estática.
// Implementa o padrão do Banco Central (formato BR Code).
function emv(id: string, value: string) {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
      else crc <<= 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

const sanitize = (s: string, max: number) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .slice(0, max);

export function buildPixPayload(
  key = PIX_KEY,
  amount = PIX_AMOUNT,
  description = PIX_DESCRIPTION,
  merchant = PIX_MERCHANT_NAME,
  city = PIX_MERCHANT_CITY,
): string {
  const gui = emv('00', 'br.gov.bcb.pix') + emv('01', key) + emv('02', description.slice(0, 50));
  const merchantAccountInfo = emv('26', gui);
  const payload =
    emv('00', '01') +
    merchantAccountInfo +
    emv('52', '0000') +
    emv('53', '986') +
    emv('54', amount.toFixed(2)) +
    emv('58', 'BR') +
    emv('59', sanitize(merchant, 25)) +
    emv('60', sanitize(city, 15)) +
    emv('62', emv('05', '***')) +
    '6304';
  return payload + crc16(payload);
}
