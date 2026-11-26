import QRCode from 'qrcode';
import type { CardDesignConfig, PackageConfig } from '../types/studio';

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

export async function generateQrDataUrl(text: string, width = 180): Promise<string> {
  return QRCode.toDataURL(text, {
    width,
    margin: 1,
    color: {
      dark: '#0b2239',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}

export async function renderCr80DataUrl(
  side: 'front' | 'back',
  design: CardDesignConfig,
  packages: PackageConfig[],
  options: {
    cardNumber?: string;
    category?: string;
    packageDisplay?: string;
    baseUrl?: string;
  } = {}
): Promise<string> {
  const w = 1011;
  const h = 638;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const cardNumber = options.cardNumber || `${design.serialPrefix || 'FS'}-0001`;
  const pkgId = options.category || 'Umum';
  const pkgObj = packages.find((p) => p.id === pkgId);
  const pkgDisplayText =
    (options.packageDisplay !== undefined ? options.packageDisplay : design.packageDisplay) ||
    (pkgObj ? pkgObj.cardLabel : `Paket: ${pkgId}`);
  const base = options.baseUrl || window.location.href.split('#')[0].split('?')[0];
  const qrPayloadUrl = `${base}?kartu=${encodeURIComponent(cardNumber)}#daftar`;

  if (design.theme === 'studio-geometric') {
    const primary = design.primaryColor || '#00839a';
    const sky = design.accentColor || '#7dd3fc';
    const darkInk = design.darkColor || '#0b1c2c';
    const ig = design.instagram || '@faridstudiomakassar';
    const tag = design.hashtag || '#AbadikanMomenBersamaFaridStudio';

    if (side === 'front') {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, w, h);

      // Subtle off-white diagonal diamond pattern matching reference card
      ctx.save();
      ctx.fillStyle = '#eef3f8';
      const stepX = 218;
      const stepY = 205;
      for (let row = -1; row < 5; row++) {
        for (let col = -1; col < 6; col++) {
          const cx = col * stepX + (row % 2 === 0 ? 105 : 0);
          const cy = row * stepY + 18;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-62, -62, 124, 124);
          ctx.restore();
        }
      }
      ctx.restore();

      // Top-left geometric folds + dark charcoal side notch
      ctx.fillStyle = primary;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(132, 0);
      ctx.lineTo(0, 132);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = sky;
      ctx.beginPath();
      ctx.moveTo(132, 0);
      ctx.lineTo(272, 0);
      ctx.lineTo(202, 74);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#2f3337';
      ctx.beginPath();
      ctx.moveTo(0, 132);
      ctx.lineTo(66, 198);
      ctx.lineTo(0, 264);
      ctx.closePath();
      ctx.fill();

      // Top-right rounded teal header tab
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(w * 0.54, 0);
      ctx.lineTo(w, 0);
      ctx.lineTo(w, 110);
      ctx.lineTo(w * 0.54 + 54, 110);
      ctx.quadraticCurveTo(w * 0.54, 110, w * 0.54, 56);
      ctx.closePath();
      ctx.fillStyle = primary;
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 30px "Outfit", "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(design.badgeLabel || 'KARTU MEMBER', w * 0.725, 67);

      // Brand title with soft offset shadow
      const titleText = design.brandTitle || 'FARID STUDIO';
      const titleFont = `900 ${Math.max(46, Math.min(64, design.titleSize || 54))}px "Outfit", "Plus Jakarta Sans", sans-serif`;
      ctx.font = titleFont;
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(15, 23, 42, 0.12)';
      ctx.fillText(titleText, 72, 209);
      ctx.fillStyle = primary;
      ctx.fillText(titleText, 68, 205);

      // Phone meta
      ctx.fillStyle = darkInk;
      ctx.font = '700 23px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`Hp/Wa: ${design.phoneText || '+62-8523-097-571'}`, 124, 254);

      // Serial info card box
      ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
      ctx.strokeStyle = '#a8d4de';
      ctx.lineWidth = 2;
      drawRoundRect(ctx, 68, 308, 620, 188, 22);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = primary;
      ctx.font = '800 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('NOMOR SERI KARTU MEMBER', 88, 344);

      ctx.fillStyle = darkInk;
      ctx.font = '800 46px "JetBrains Mono", monospace';
      ctx.fillText(cardNumber, 88, 396);

      ctx.fillStyle = '#334155';
      ctx.font = '600 19px "Plus Jakarta Sans", sans-serif';
      ctx.fillText((design.cardCaption || '').slice(0, 56), 88, 436, 560);

      ctx.fillStyle = '#475569';
      ctx.font = '700 17px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`${pkgDisplayText}  •  ${ig}  •  ${tag}`, 88, 470, 575);

      // Bottom-left rounded teal social tab
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, h - 72);
      ctx.lineTo(420, h - 72);
      ctx.quadraticCurveTo(462, h - 72, 462, h - 30);
      ctx.lineTo(462, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = primary;
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 17px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`${ig}  •  ${tag}`, 34, h - 28, 405);

      // Bottom-right geometric triangles
      ctx.fillStyle = sky;
      ctx.beginPath();
      ctx.moveTo(720, h);
      ctx.lineTo(796, h - 82);
      ctx.lineTo(868, h);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = primary;
      ctx.beginPath();
      ctx.moveTo(860, h);
      ctx.lineTo(w, h - 148);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Right-side QR container with embedded label
      const qrSize = Math.min(208, Math.max(170, Number(design.qrSize || 195)));
      const boxW = qrSize + 44;
      const boxH = qrSize + 68;
      const qrX = w - boxW - 56;
      const qrY = 274;

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2.5;
      drawRoundRect(ctx, qrX, qrY, boxW, boxH, 22);
      ctx.fill();
      ctx.stroke();

      const qrUrl = await generateQrDataUrl(qrPayloadUrl, qrSize);
      if (qrUrl) {
        const img = new Image();
        img.src = qrUrl;
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
        ctx.drawImage(img, qrX + 22, qrY + 18, qrSize, qrSize);
      }

      ctx.fillStyle = darkInk;
      ctx.font = '800 13.5px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        design.qrLabel || 'SCAN DAFTAR MEMBER',
        qrX + boxW / 2,
        qrY + qrSize + 46,
        boxW - 20
      );

      return canvas.toDataURL('image/png');
    }

    // Back side matching Studio Geometric theme
    ctx.fillStyle = darkInk;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, w, 18);

    ctx.fillStyle = sky;
    ctx.beginPath();
    ctx.moveTo(w - 190, 18);
    ctx.lineTo(w, 18);
    ctx.lineTo(w, 130);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = primary;
    drawRoundRect(ctx, 54, 48, 490, 56, 14);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 25px "Outfit", "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(design.backTitle || 'SYARAT & KETENTUAN MEMBER', 78, 84);

    const rules = [
      '1. Kartu ini adalah kartu keanggotaan resmi Farid Studio Multimedia.',
      '2. Tunjukkan fisik kartu atau kartu digital saat transaksi di kasir studio.',
      '3. Berlaku untuk diskon sesi foto studio, wisuda, keluarga, dan cetak foto.',
      '4. Aktivasi mandiri & cek keaslian dapat dilakukan dengan memindai QR Code.',
      '5. Kartu tidak dapat diuangkan dan berlaku sesuai masa aktif paket.',
    ];
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
    rules.forEach((line, idx) => {
      ctx.fillText(line, 54, 165 + idx * 45, w - 108);
    });

    ctx.strokeStyle = 'rgba(125, 211, 252, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(54, 412);
    ctx.lineTo(w - 54, 412);
    ctx.stroke();

    ctx.fillStyle = sky;
    ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`Instagram: ${ig}   •   ${tag}`, 54, 458, w - 108);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`Studio Utama: ${design.addressMain || ''}`, 54, 506, w - 108);
    ctx.fillText(`${design.addressBranch || ''}`, 54, 540, w - 108);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`WhatsApp Admin: ${design.phoneText || '+62-8523-097-571'}`, 54, 594, w - 280);

    ctx.fillStyle = sky;
    ctx.font = '700 24px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(cardNumber, w - 54, 594);

    return canvas.toDataURL('image/png');
  }

  if (design.theme === 'photo-studio-pro') {
    const obsidian = design.darkColor || '#0b0f17';
    const gold = design.accentColor || '#d4af37';
    const slateFrame = '#1e293b';

    if (side === 'front') {
      // Rich matte dark editorial studio surface
      ctx.fillStyle = obsidian;
      ctx.fillRect(0, 0, w, h);

      // Subtle camera rule-of-thirds viewfinder grid
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.14)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.333, 32);
      ctx.lineTo(w * 0.333, h - 32);
      ctx.moveTo(w * 0.666, 32);
      ctx.lineTo(w * 0.666, h - 32);
      ctx.moveTo(32, h * 0.333);
      ctx.lineTo(w - 32, h * 0.333);
      ctx.moveTo(32, h * 0.666);
      ctx.lineTo(w - 32, h * 0.666);
      ctx.stroke();

      // Viewfinder corner L-brackets
      ctx.strokeStyle = gold;
      ctx.lineWidth = 3;
      const m = 28;
      const bLen = 28;
      const corners = [
        [m, m, 1, 1],
        [w - m, m, -1, 1],
        [m, h - m, 1, -1],
        [w - m, h - m, -1, -1],
      ];
      corners.forEach(([cx, cy, dx, dy]) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy + dy * bLen);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + dx * bLen, cy);
        ctx.stroke();
      });

      // Decorative subtle lens aperture ring on left backdrop
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(168, 128, 72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(168, 128, 48, 0, Math.PI * 2);
      ctx.stroke();

      // Top gold accent strip
      ctx.fillStyle = gold;
      ctx.fillRect(54, 52, 72, 4);

      // Brand header
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.max(40, Math.min(58, design.titleSize || 48))}px "Outfit", "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(design.brandTitle || 'FARID STUDIO', 54, 114);

      ctx.fillStyle = gold;
      ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(
        `PHOTOGRAPHY & VISUAL STUDIO   •   WA ${design.phoneText || '+62-8523-097-571'}`,
        54,
        150
      );

      // Top-right membership badge plate
      ctx.fillStyle = 'rgba(212, 175, 55, 0.14)';
      ctx.strokeStyle = gold;
      ctx.lineWidth = 2;
      drawRoundRect(ctx, w - 310, 56, 256, 46, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = gold;
      ctx.font = '800 18px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(design.badgeLabel || 'STUDIO PRO PASS', w - 182, 86);

      // Package label & serial block
      ctx.textAlign = 'left';
      ctx.fillStyle = '#141b29';
      ctx.strokeStyle = slateFrame;
      ctx.lineWidth = 2;
      drawRoundRect(ctx, 54, 210, 620, 290, 18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = gold;
      ctx.font = '800 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(pkgDisplayText.toUpperCase(), 84, 255);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('EDITION SERIAL NUMBER', 84, 304);

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 54px "JetBrains Mono", monospace';
      ctx.fillText(cardNumber, 84, 366);

      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(84, 396);
      ctx.lineTo(640, 396);
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '500 19px "Plus Jakarta Sans", sans-serif';
      const cap = design.cardCaption || '';
      ctx.fillText(cap.slice(0, 54), 84, 434);
      if (cap.length > 54) ctx.fillText(cap.slice(54, 106), 84, 462);

      // Bottom studio signature
      ctx.fillStyle = '#94a3b8';
      ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(
        `${design.instagram || '@faridstudiomakassar'}   •   ${design.hashtag || '#AbadikanMomenBersamaFaridStudio'}`,
        54,
        568
      );

      // Crisp white quiet-zone QR box framed in gold
      const qrSize = Math.min(198, Math.max(150, Number(design.qrSize || 175)));
      const qrBoxW = qrSize + 36;
      const qrBoxH = qrSize + 58;
      const qrX = w - qrBoxW - 54;
      const qrY = 216;

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = gold;
      ctx.lineWidth = 3;
      drawRoundRect(ctx, qrX, qrY, qrBoxW, qrBoxH, 18);
      ctx.fill();
      ctx.stroke();

      const qrUrl = await generateQrDataUrl(qrPayloadUrl, qrSize);
      if (qrUrl) {
        const img = new Image();
        img.src = qrUrl;
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
        ctx.drawImage(img, qrX + 18, qrY + 14, qrSize, qrSize);
      }

      ctx.fillStyle = obsidian;
      ctx.font = '800 13px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        design.qrLabel || 'SCAN VERIFIKASI MEMBER',
        qrX + qrBoxW / 2,
        qrY + qrSize + 40,
        qrBoxW - 16
      );

      return canvas.toDataURL('image/png');
    }

    // Back side for Photo Studio Pro
    ctx.fillStyle = obsidian;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = gold;
    ctx.fillRect(0, 42, w, 66);

    ctx.fillStyle = obsidian;
    ctx.font = '900 26px "Outfit", "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(design.backTitle || 'SYARAT & KETENTUAN MEMBER', 54, 85);

    const rules = [
      '1. Kartu keanggotaan resmi Farid Studio Multimedia & Photography.',
      '2. Tunjukkan fisik kartu atau QR digital sebelum sesi pemotretan dimulai.',
      '3. Berlaku untuk prioritas booking studio, sesi wisuda, keluarga & cetak.',
      '4. Scan QR Code pada sisi depan untuk verifikasi keaslian & aktivasi.',
      '5. Kartu bersifat pribadi dan berlaku sesuai ketentuan paket aktif.',
    ];
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
    rules.forEach((line, idx) => {
      ctx.fillText(line, 54, 168 + idx * 45, w - 108);
    });

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(54, 412);
    ctx.lineTo(w - 54, 412);
    ctx.stroke();

    ctx.fillStyle = gold;
    ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      `Instagram: ${design.instagram || '@faridstudiomakassar'}   •   ${design.hashtag || '#AbadikanMomenBersamaFaridStudio'}`,
      54,
      458,
      w - 108
    );

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`Studio Utama: ${design.addressMain || ''}`, 54, 506, w - 108);
    ctx.fillText(`${design.addressBranch || ''}`, 54, 540, w - 108);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`WhatsApp Studio: ${design.phoneText || '+62-8523-097-571'}`, 54, 594, w - 280);

    ctx.fillStyle = gold;
    ctx.font = '700 24px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(cardNumber, w - 54, 594);

    return canvas.toDataURL('image/png');
  }

  const isDarkTheme = design.theme === 'exclusive-vip' || design.theme === 'royal-navy';

  if (side === 'front') {
    ctx.fillStyle = isDarkTheme ? design.darkColor : '#ffffff';
    ctx.fillRect(0, 0, w, h);

    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, design.primaryColor);
    grad.addColorStop(1, design.accentColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, 24);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w * 0.68, 0);
    ctx.lineTo(w * 0.56, 175);
    ctx.lineTo(0, 175);
    ctx.closePath();
    ctx.fillStyle = isDarkTheme ? 'rgba(255,255,255,0.06)' : 'rgba(0,139,163,0.08)';
    ctx.fill();

    ctx.fillStyle = isDarkTheme ? '#ffffff' : design.darkColor;
    ctx.font = `900 ${design.titleSize || 48}px "Outfit", "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(design.brandTitle || 'FARID STUDIO', 54, 102);

    ctx.fillStyle = design.accentColor;
    ctx.font = '700 21px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`MULTIMEDIA & PHOTOGRAPHY  •  ${design.phoneText || '+62-8523-097-571'}`, 54, 138);

    ctx.fillStyle = design.primaryColor;
    drawRoundRect(ctx, w - 310, 48, 256, 48, 24);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 20px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(design.badgeLabel || 'KARTU MEMBER', w - 182, 79);

    ctx.textAlign = 'left';
    ctx.fillStyle = isDarkTheme ? 'rgba(245, 158, 11, 0.2)' : 'rgba(0, 139, 163, 0.12)';
    drawRoundRect(ctx, 54, 195, 420, 46, 12);
    ctx.fill();
    ctx.fillStyle = isDarkTheme ? '#fbbf24' : design.primaryColor;
    ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(pkgDisplayText, 74, 225);

    ctx.fillStyle = isDarkTheme ? '#94a3b8' : '#64748b';
    ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('NOMOR SERI KARTU MEMBER', 54, 295);

    ctx.fillStyle = isDarkTheme ? '#ffffff' : design.darkColor;
    ctx.font = '700 56px "JetBrains Mono", monospace';
    ctx.fillText(cardNumber, 54, 358);

    ctx.fillStyle = isDarkTheme ? '#cbd5e1' : '#475569';
    ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
    const caption = design.cardCaption || '';
    ctx.fillText(caption.slice(0, 54), 54, 420);
    if (caption.length > 54) ctx.fillText(caption.slice(54, 108), 54, 448);

    const barX = 54;
    const barY = 485;
    ctx.fillStyle = isDarkTheme ? '#ffffff' : '#0f172a';
    for (let i = 0; i < 46; i++) {
      const code = cardNumber.charCodeAt(i % cardNumber.length) + i * 7;
      const bw = (code % 3) + 2;
      if (i % 2 === 0) ctx.fillRect(barX + i * 9, barY, bw, 58);
    }
    ctx.font = '700 16px "JetBrains Mono", monospace';
    ctx.fillText(`*${cardNumber}*`, 54, 568);

    const qrSize = Number(design.qrSize || 155);
    const qrBoxSize = qrSize + 28;
    const qrX = w - qrBoxSize - 54;
    const qrY = 230;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = design.primaryColor;
    ctx.lineWidth = 3;
    drawRoundRect(ctx, qrX, qrY, qrBoxSize, qrBoxSize, 20);
    ctx.fill();
    ctx.stroke();

    const qrUrl = await generateQrDataUrl(qrPayloadUrl, qrSize);
    if (qrUrl) {
      const img = new Image();
      img.src = qrUrl;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
      ctx.drawImage(img, qrX + 14, qrY + 14, qrSize, qrSize);
    }

    ctx.fillStyle = isDarkTheme ? '#e2e8f0' : design.darkColor;
    ctx.font = '800 15px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      design.qrLabel || 'SCAN AKTIVASI / CEK KARTU',
      qrX + qrBoxSize / 2,
      qrY + qrBoxSize + 28
    );

    ctx.fillStyle = design.primaryColor;
    ctx.fillRect(0, h - 18, w, 18);
  } else {
    ctx.fillStyle = design.darkColor;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = design.primaryColor;
    ctx.fillRect(0, 44, w, 72);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 28px "Outfit", "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(design.backTitle || 'SYARAT & KETENTUAN MEMBER', 54, 90);

    const rules = [
      '1. Kartu ini adalah kartu keanggotaan resmi Farid Studio Multimedia.',
      '2. Tunjukkan fisik kartu atau kartu digital saat transaksi di kasir studio.',
      '3. Berlaku untuk diskon sesi foto studio, wisuda, keluarga, dan cetak foto.',
      '4. Aktivasi mandiri dapat dilakukan dengan memindai QR Code di sisi depan.',
      '5. Kartu tidak dapat diuangkan dan berlaku sesuai masa aktif paket.',
    ];
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
    rules.forEach((line, idx) => {
      ctx.fillText(line, 54, 175 + idx * 44, w - 108);
    });

    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(54, 415);
    ctx.lineTo(w - 54, 415);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      `Instagram: ${design.instagram || '@faridstudiomakassar'}   •   ${design.hashtag || '#AbadikanMomenBersamaFaridStudio'}`,
      54,
      462,
      w - 108
    );

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`Studio Utama: ${design.addressMain || ''}`, 54, 510, w - 108);
    ctx.fillText(`${design.addressBranch || ''}`, 54, 544, w - 108);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 17px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`WhatsApp Admin: ${design.phoneText || '+62-8523-097-571'}`, 54, 595, w - 280);

    ctx.fillStyle = design.accentColor;
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(cardNumber, w - 54, 595);
  }

  return canvas.toDataURL('image/png');
}

export async function renderMassQrPosterDataUrl(
  registrationUrl: string,
  addressMain: string
): Promise<string> {
  const poster = document.createElement('canvas');
  poster.width = 900;
  poster.height = 1200;
  const ctx = poster.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 900, 1200);
  ctx.fillStyle = '#008ba3';
  ctx.fillRect(0, 0, 900, 26);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FARID STUDIO MULTIMEDIA', 450, 118);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 50px "Outfit", sans-serif';
  ctx.fillText('SCAN QR DAFTAR MEMBER BARU', 450, 190);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('KHUSUS PENDAFTARAN & AKTIVASI MENJADI MEMBER', 450, 232);

  ctx.fillStyle = '#ffffff';
  drawRoundRect(ctx, 210, 270, 480, 480, 32);
  ctx.fill();

  const qrUrl = await generateQrDataUrl(registrationUrl, 400);
  const img = new Image();
  img.src = qrUrl;
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.onerror = () => resolve();
  });
  ctx.drawImage(img, 250, 310, 400, 400);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '600 25px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('1. Scan QR Code dengan Kamera HP Anda', 450, 835);
  ctx.fillText('2. Isi Data Diri & Nomor Seri Kartu Baru', 450, 890);

  ctx.fillStyle = '#34d399';
  ctx.font = '800 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('3. RESMI MENJADI MEMBER AKTIF!', 450, 960);

  ctx.fillStyle = '#fbbf24';
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Proteksi Anti Daftar Ulang: 1 Nomor Kartu & 1 WhatsApp = 1 Member', 450, 1025);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(addressMain, 450, 1100);

  return poster.toDataURL('image/png');
}
