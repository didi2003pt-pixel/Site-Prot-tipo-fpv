const SPREADSHEET_ID = '1dsZUfvE32-QHOiLWw_oV9HVndptgihclEM2ZZQYMa18';
const SHEET_NAME = 'Submissões';
const PDF_FOLDER_ID = '1no4n9kFXx9HjXY3N2H87b7ebzbRfsael';

const COL = {
  ID: 1,
  SUBMITTED_AT: 2,
  EMAIL: 3,
  START_DATE: 4,
  END_DATE: 5,
  ATHLETE: 6,
  CLUB: 7,
  DECLARED_RESULT: 8,
  SOURCE_TYPE: 9,
  SOURCE_URL: 10,
  PDF_URL: 11,
  DETECTED_GENERAL: 12,
  RESULT_COUNTRY: 13,
  COUNTRY_CODE: 14,
  PARTICIPANTS: 15,
  PARTICIPANT_COUNTRIES: 16,
  CLASS: 17,
  EVENT: 18,
  LOCATION: 19,
  CONFIDENCE: 20,
  ANALYSIS_STATUS: 21,
  FPV_STATUS: 22,
  NOTES: 23,
  VALIDATED_BY: 24,
  VALIDATED_AT: 25,
  EMAIL_SENT: 26,
  EMAIL_AT: 27,
  EMAIL_ERROR: 28
};

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (payload.action !== 'create_submission' || !payload.record) {
      return json_({ ok: false, error: 'Pedido inválido.' });
    }

    const r = payload.record;
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) return json_({ ok: false, error: 'Folha não encontrada.' });

    const duplicate = findDuplicate_(sheet, r);
    if (duplicate) {
      return json_({ ok: false, error: 'Esta submissão parece já ter sido recebida.', duplicateId: duplicate });
    }

    const id = nextReference_(sheet);
    let pdfUrl = '';

    if (payload.pdfBase64) {
      const bytes = Utilities.base64Decode(payload.pdfBase64);
      const blob = Utilities.newBlob(
        bytes,
        payload.pdfMimeType || 'application/pdf',
        safeFileName_(payload.pdfFileName || (id + '.pdf'))
      );
      const folder = DriveApp.getFolderById(PDF_FOLDER_ID);
      const file = folder.createFile(blob);
      file.setDescription('Resultado internacional ' + id + ' — recebido através da plataforma FPV.');
      pdfUrl = file.getUrl();
    }

    const row = [
      id,
      new Date(r.submittedAt || new Date().toISOString()),
      clean_(r.email),
      parseDate_(r.startDate),
      parseDate_(r.endDate),
      clean_(r.athlete),
      clean_(r.club),
      clean_(r.declaredResult),
      clean_(r.sourceType),
      clean_(r.sourceUrl),
      pdfUrl || clean_(r.pdfDriveUrl),
      value_(r.detectedGeneral),
      value_(r.resultCountry),
      clean_(r.countryCode),
      value_(r.participants),
      value_(r.participantCountries),
      clean_(r.className),
      clean_(r.eventName),
      clean_(r.location),
      clean_(r.confidence),
      clean_(r.analysisStatus || 'NÃO ANALISADO'),
      'PENDENTE',
      '',
      '',
      '',
      false,
      '',
      ''
    ];

    sheet.appendRow(row);
    const rowNumber = sheet.getLastRow();
    sheet.getRange(rowNumber, COL.SUBMITTED_AT).setNumberFormat('dd/mm/yyyy hh:mm');
    sheet.getRange(rowNumber, COL.START_DATE, 1, 2).setNumberFormat('dd/mm/yyyy');

    return json_({ ok: true, id, pdfUrl, row: rowNumber });
  } catch (err) {
    return json_({ ok: false, error: 'Não foi possível guardar a submissão.' });
  } finally {
    lock.releaseLock();
  }
}

function onEditValidation(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_NAME) return;
  if (e.range.getColumn() !== COL.FPV_STATUS || e.range.getRow() < 2) return;

  const status = String(e.value || '').trim().toUpperCase();
  if (status !== 'VALIDADO') return;

  const row = e.range.getRow();
  const emailSent = sheet.getRange(row, COL.EMAIL_SENT).getValue();
  if (emailSent === true) return;

  const email = String(sheet.getRange(row, COL.EMAIL).getValue() || '').trim();
  const athlete = String(sheet.getRange(row, COL.ATHLETE).getValue() || '').trim();
  const id = String(sheet.getRange(row, COL.ID).getValue() || '').trim();
  const eventName = String(sheet.getRange(row, COL.EVENT).getValue() || '').trim();
  const declared = String(sheet.getRange(row, COL.DECLARED_RESULT).getValue() || '').trim();
  const resultCountry = String(sheet.getRange(row, COL.RESULT_COUNTRY).getValue() || '').trim();

  if (!email) {
    sheet.getRange(row, COL.EMAIL_ERROR).setValue('Email em falta.');
    return;
  }

  const validator = Session.getActiveUser().getEmail() || 'FPV';
  const now = new Date();

  sheet.getRange(row, COL.VALIDATED_BY).setValue(validator);
  sheet.getRange(row, COL.VALIDATED_AT).setValue(now).setNumberFormat('dd/mm/yyyy hh:mm');

  const lines = [
    'Olá ' + (athlete || 'velejador/a') + ',',
    '',
    'O resultado internacional que submeteste à Federação Portuguesa de Vela foi revisto e validado.',
    '',
    'Referência: ' + id,
    eventName ? 'Competição: ' + eventName : '',
    declared ? 'Resultado: ' + declared : '',
    resultCountry ? 'Resultado País: ' + resultCountry : '',
    '',
    'Obrigado por contribuíres para mantermos atualizada a informação sobre a participação portuguesa em competições internacionais.',
    '',
    'Federação Portuguesa de Vela'
  ].filter(Boolean);

  try {
    MailApp.sendEmail({
      to: email,
      subject: 'FPV — Resultado internacional validado',
      body: lines.join('\n'),
      name: 'Federação Portuguesa de Vela'
    });
    sheet.getRange(row, COL.EMAIL_SENT).setValue(true);
    sheet.getRange(row, COL.EMAIL_AT).setValue(new Date()).setNumberFormat('dd/mm/yyyy hh:mm');
    sheet.getRange(row, COL.EMAIL_ERROR).clearContent();
  } catch (err) {
    sheet.getRange(row, COL.EMAIL_ERROR).setValue(String(err && err.message || err).slice(0, 500));
  }
}

function setup() {
  const triggers = ScriptApp.getProjectTriggers();
  const exists = triggers.some(t => t.getHandlerFunction() === 'onEditValidation');
  if (!exists) {
    ScriptApp.newTrigger('onEditValidation')
      .forSpreadsheet(SPREADSHEET_ID)
      .onEdit()
      .create();
  }
  return 'Configuração concluída.';
}

function nextReference_(sheet) {
  const year = new Date().getFullYear();
  const lastRow = sheet.getLastRow();
  let max = 0;
  if (lastRow >= 2) {
    const ids = sheet.getRange(2, COL.ID, lastRow - 1, 1).getDisplayValues().flat();
    ids.forEach(id => {
      const m = String(id).match(new RegExp('^RI-' + year + '-(\\d{4})$'));
      if (m) max = Math.max(max, Number(m[1]));
    });
  }
  return 'RI-' + year + '-' + String(max + 1).padStart(4, '0');
}

function findDuplicate_(sheet, r) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return '';
  const start = Math.max(2, lastRow - 199);
  const values = sheet.getRange(start, 1, lastRow - start + 1, 10).getDisplayValues();
  const email = clean_(r.email).toLowerCase();
  const athlete = clean_(r.athlete).toLowerCase();
  const declared = clean_(r.declaredResult).toLowerCase();
  const source = clean_(r.sourceUrl).toLowerCase();

  for (let i = values.length - 1; i >= 0; i--) {
    const row = values[i];
    if (
      String(row[2] || '').toLowerCase() === email &&
      String(row[5] || '').toLowerCase() === athlete &&
      String(row[7] || '').toLowerCase() === declared &&
      String(row[9] || '').toLowerCase() === source
    ) return row[0] || '';
  }
  return '';
}

function parseDate_(value) {
  if (!value) return '';
  const d = new Date(value + 'T12:00:00');
  return isNaN(d.getTime()) ? '' : d;
}

function clean_(value) {
  return String(value == null ? '' : value).replace(/[<>]/g, '').trim().slice(0, 2000);
}

function value_(value) {
  return value == null ? '' : value;
}

function safeFileName_(name) {
  return String(name || 'resultado.pdf').replace(/[^a-zA-Z0-9._()\- áàâãéêíóôõúç]/g, '_').slice(0, 160);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
