export function formatCheckCurrency(amount: number): string {
  return amount.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const UNITS = [
  "cero",
  "uno",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
];

const TEN_TO_TWENTY = [
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciseis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
  "veinte",
];

const TENS = [
  "",
  "",
  "veinte",
  "treinta",
  "cuarenta",
  "cincuenta",
  "sesenta",
  "setenta",
  "ochenta",
  "noventa",
];

const HUNDREDS = [
  "",
  "ciento",
  "doscientos",
  "trescientos",
  "cuatrocientos",
  "quinientos",
  "seiscientos",
  "setecientos",
  "ochocientos",
  "novecientos",
];

function convertTens(value: number): string {
  if (value < 10) return UNITS[value];
  if (value <= 20) return TEN_TO_TWENTY[value - 10];
  if (value < 30) return value === 20 ? "veinte" : `veinti${UNITS[value - 20]}`;

  const ten = Math.floor(value / 10);
  const unit = value % 10;
  return unit === 0 ? TENS[ten] : `${TENS[ten]} y ${UNITS[unit]}`;
}

function convertHundreds(value: number): string {
  if (value < 100) return convertTens(value);
  if (value === 100) return "cien";

  const hundred = Math.floor(value / 100);
  const remainder = value % 100;
  return remainder === 0
    ? HUNDREDS[hundred]
    : `${HUNDREDS[hundred]} ${convertTens(remainder)}`;
}

function convertSection(
  value: number,
  singular: string,
  plural: string,
): string {
  if (value === 0) return "";
  if (value === 1) return singular;
  return `${convertNumber(value)} ${plural}`;
}

export function convertNumber(value: number): string {
  if (value < 1000) return convertHundreds(value);
  if (value < 1_000_000) {
    const thousands = Math.floor(value / 1000);
    const remainder = value % 1000;
    const thousandsText = convertSection(thousands, "mil", "mil");
    return remainder === 0
      ? thousandsText
      : `${thousandsText} ${convertHundreds(remainder)}`;
  }
  if (value < 1_000_000_000) {
    const millions = Math.floor(value / 1_000_000);
    const remainder = value % 1_000_000;
    const millionsText = convertSection(millions, "un millon", "millones");
    return remainder === 0
      ? millionsText
      : `${millionsText} ${convertNumber(remainder)}`;
  }

  return String(value);
}

export function amountToWordsEs(amount: number): string {
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const integerPart = Math.floor(safeAmount);
  const cents = Math.round((safeAmount - integerPart) * 100);
  const words = convertNumber(integerPart);
  const normalizedWords =
    words.charAt(0).toUpperCase() + words.slice(1).replace(/\buno\b/g, "un");

  return `${normalizedWords} pesos con ${String(cents).padStart(2, "0")}/100`;
}
