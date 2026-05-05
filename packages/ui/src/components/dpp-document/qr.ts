import QRCode from 'qrcode'

/** Generate an inline SVG QR for a GS1 Digital Link URL. Server-only —
 * intended for SSR pages so the rendered HTML ships static. */
export async function generateQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#0a0a0a', light: '#ffffff' },
  })
}
