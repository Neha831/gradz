import {
  GRADEZY_BRAND_PRINT_CSS,
  GRADEZY_PRINT_FOOTER,
  brandMarkPrintHtml,
  gradezyLogoAbsoluteUrl
} from '../constants/brand.js';

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Safe single segment for download filenames (Windows + web). */
function safeFilenamePart(s, maxLen = 64) {
  return String(s ?? '')
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, maxLen)
    .replace(/^_+|_+$/g, '') || 'x';
}

/** Build printable result card HTML (matches legacy PHP layout). */
export function buildStudentResultCardHtml(data) {
  const obtained = parseFloat(data.obtained_marks) || 0;
  const max = parseFloat(data.max_marks) || 1;
  const percentage = max > 0 ? ((obtained / max) * 100).toFixed(2) : '0.00';

  let grade = 'F';
  const p = Number(percentage);
  if (p >= 90) grade = 'A+';
  else if (p >= 80) grade = 'A';
  else if (p >= 70) grade = 'B';
  else if (p >= 60) grade = 'C';

  const logoUrl = gradezyLogoAbsoluteUrl();
  const title = escapeHtml(data.exam_title);
  const code = escapeHtml(data.exam_code);
  const email = escapeHtml(data.email_id);
  const studentName = String(data.student_name || '').trim();
  const nameLine = studentName
    ? `<p><strong>Student Name:</strong> <span style="color: #374151;">${escapeHtml(studentName)}</span></p>`
    : '';

  return `
    <div style="
      font-family: 'Inter', sans-serif;
      max-width: 650px;
      margin: 40px auto;
      padding: 32px;
      border-radius: 14px;
      background: #fff;
      box-shadow: 0 8px 20px rgba(0,0,0,0.1);
      color: #1f2937;
      border: 1px solid #e5e7eb;
    ">
      <style>${GRADEZY_BRAND_PRINT_CSS}</style>
      <header style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 24px;">
        ${brandMarkPrintHtml(logoUrl)}
        <div>
          <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 500;">
            <span style="color: #4a5568;">Product by </span>
            <span style="color: #D147A3;">Fourise </span>
            <span style="color: #006400;">Software </span>
            <span style="color: #00008B;">Solutions </span>
            <span style="color: #4a5568;">Pvt Ltd</span>
          </p>
        </div>
      </header>
      <h1 style="font-weight: 700; font-size: 24px; color: #2563eb; margin-bottom: 24px;">Exam Result</h1>
      <section style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        <p><strong>Exam Title:</strong> <span style="color: #374151;">${title}</span></p>
        <p><strong>Exam Code:</strong> <span style="color: #374151;">${code}</span></p>
        <p><strong>Student Email:</strong> <span style="color: #374151;">${email}</span></p>
        ${nameLine}
      </section>
      <section style="display: flex; justify-content: space-between; margin-bottom: 28px; flex-wrap: wrap; gap: 12px;">
        <div style="text-align: center; flex: 1; min-width: 100px;">
          <div style="font-weight: 600; color: #6b7280; margin-bottom: 6px;">Max Marks</div>
          <div style="font-size: 24px; font-weight: 700; color: #111827;">${escapeHtml(String(data.max_marks))}</div>
        </div>
        <div style="text-align: center; flex: 1; min-width: 100px;">
          <div style="font-weight: 600; color: #6b7280; margin-bottom: 6px;">Obtained Marks</div>
          <div style="font-size: 24px; font-weight: 700; color: #16a34a;">${escapeHtml(String(data.obtained_marks))}</div>
        </div>
        <div style="text-align: center; flex: 1; min-width: 100px;">
          <div style="font-weight: 600; color: #6b7280; margin-bottom: 6px;">Percentage</div>
          <div style="font-size: 24px; font-weight: 700; color: #2563eb;">${escapeHtml(percentage)}%</div>
        </div>
        <div style="text-align: center; flex: 1; min-width: 100px;">
          <div style="font-weight: 600; color: #6b7280; margin-bottom: 6px;">Grade</div>
          <div style="font-size: 24px; font-weight: 700; color: ${grade === 'F' ? '#dc2626' : '#f59e0b'};">${escapeHtml(grade)}</div>
        </div>
      </section>
      <footer style="text-align: center; font-weight: 600; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        ${GRADEZY_PRINT_FOOTER}
      </footer>
    </div>
  `;
}

/**
 * @param {object} row — exam_title, exam_code, max_marks, obtained_marks, email_id; optional student_name
 * @param {'view'|'download'} action
 */
export async function generateStudentResultPdf(row, action) {
  const html = buildStudentResultCardHtml(row);
  const host = document.createElement('div');
  host.style.position = 'absolute';
  host.style.left = '-9999px';
  host.style.top = '0';
  host.innerHTML = html;
  document.body.appendChild(host);
  const element = host.firstElementChild;
  if (!element) {
    document.body.removeChild(host);
    return;
  }

  const { default: html2pdf } = await import('html2pdf.js');
  const filename = `Result_${safeFilenamePart(row.exam_code)}_${safeFilenamePart(row.email_id)}.pdf`;

  const options = {
    margin: 0.5,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  try {
    const worker = html2pdf().set(options).from(element);
    if (action === 'view') {
      const blobUrl = await worker.output('bloburl');
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    } else {
      await worker.save();
    }
  } finally {
    host.remove();
  }
}
