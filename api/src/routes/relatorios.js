const express = require('express');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const db = require('../database');
const { autenticar, verificarPermissao } = require('../middlewares/auth');

const router = express.Router();

// Login obrigatório + permissão de relatórios
router.use(autenticar, verificarPermissao('relatorios'));

// ---------- PDF HELPERS ----------
function gerarCabecalho(doc, titulo) {
  doc.fontSize(20).fillColor('#0b3d91').text('Sistema de Estoque', { align: 'left' });
  doc.fontSize(14).fillColor('#333').text(titulo, { align: 'left' });
  doc.moveDown();
  doc.fontSize(9).fillColor('#666').text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'right' });
  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#ccc').stroke();
  doc.moveDown();
}

function gerarRodape(doc) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor('#999').text(`Página ${i + 1} de ${range.count}`, 50, 800, { align: 'center' });
  }
}

// ---------- PDF ROTAS ----------
router.get('/produtos', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM produtos ORDER BY nome');
    const doc = new PDFDocument({ margin: 50, bufferPages: true, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=produtos.pdf');
    doc.pipe(res);
    gerarCabecalho(doc, 'Relatório de Produtos');

    const headerY = doc.y;
    doc.fontSize(10).fillColor('#0b3d91').font('Helvetica-Bold');
    doc.text('SKU', 50, headerY, { width: 100 });
    doc.text('Nome', 160, headerY, { width: 220 });
    doc.text('Categoria', 390, headerY, { width: 120 });
    doc.text('Qtd', 510, headerY, { width: 40, align: 'right' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#0b3d91').stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica').fillColor('#000');
    rows.forEach((p) => {
      const y = doc.y;
      doc.fontSize(9).text(p.sku, 50, y, { width: 100 });
      doc.text(p.nome, 160, y, { width: 220 });
      doc.text(p.categoria || '-', 390, y, { width: 120 });
      doc.text(String(p.quantidade), 510, y, { width: 40, align: 'right' });
      doc.moveDown(1.2);
      if (doc.y > 760) doc.addPage();
    });

    gerarRodape(doc);
    doc.end();
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/funcionarios', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM funcionarios ORDER BY nome');
    const doc = new PDFDocument({ margin: 50, bufferPages: true, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=funcionarios.pdf');
    doc.pipe(res);
    gerarCabecalho(doc, 'Relatório de Funcionários');

    const headerY = doc.y;
    doc.fontSize(10).fillColor('#0b3d91').font('Helvetica-Bold');
    doc.text('Nome', 50, headerY, { width: 150 });
    doc.text('CPF', 200, headerY, { width: 100 });
    doc.text('Cargo', 300, headerY, { width: 120 });
    doc.text('Salário', 420, headerY, { width: 80, align: 'right' });
    doc.text('Ativo', 500, headerY, { width: 50, align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#0b3d91').stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica').fillColor('#000');
    rows.forEach((f) => {
      const y = doc.y;
      doc.fontSize(9).text(f.nome, 50, y, { width: 150 });
      doc.text(f.cpf, 200, y, { width: 100 });
      doc.text(f.cargo, 300, y, { width: 120 });
      doc.text(`R$ ${Number(f.salario).toFixed(2)}`, 420, y, { width: 80, align: 'right' });
      doc.text(f.ativo ? 'Sim' : 'Não', 500, y, { width: 50, align: 'center' });
      doc.moveDown(1.2);
      if (doc.y > 760) doc.addPage();
    });

    gerarRodape(doc);
    doc.end();
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/movimentacoes', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT m.*, p.nome AS produto_nome, f.nome AS funcionario_nome
      FROM movimentacoes m
      LEFT JOIN produtos p ON p.id = m.produto_id
      LEFT JOIN funcionarios f ON f.id = m.funcionario_id
      ORDER BY m.id DESC LIMIT 500
    `);
    const doc = new PDFDocument({ margin: 50, bufferPages: true, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=movimentacoes.pdf');
    doc.pipe(res);
    gerarCabecalho(doc, 'Relatório de Movimentações');

    const headerY = doc.y;
    doc.fontSize(10).fillColor('#0b3d91').font('Helvetica-Bold');
    doc.text('Data', 50, headerY, { width: 90 });
    doc.text('Produto', 140, headerY, { width: 150 });
    doc.text('Tipo', 290, headerY, { width: 60 });
    doc.text('Qtd', 350, headerY, { width: 40, align: 'right' });
    doc.text('Funcionário', 400, headerY, { width: 150 });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#0b3d91').stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica').fillColor('#000');
    rows.forEach((m) => {
      const y = doc.y;
      doc.fontSize(9).text(new Date(m.criado_em).toLocaleDateString('pt-BR'), 50, y, { width: 90 });
      doc.text(m.produto_nome || '-', 140, y, { width: 150 });
      doc.fillColor(m.tipo === 'entrada' ? 'green' : 'red').text(m.tipo.toUpperCase(), 290, y, { width: 60 });
      doc.fillColor('#000').text(String(m.quantidade), 350, y, { width: 40, align: 'right' });
      doc.text(m.funcionario_nome || '-', 400, y, { width: 150 });
      doc.moveDown(1.2);
      if (doc.y > 760) doc.addPage();
    });

    gerarRodape(doc);
    doc.end();
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ---------- EXCEL HELPERS ----------
function estilizarHeader(sheet) {
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B3D91' } };
  header.alignment = { vertical: 'middle', horizontal: 'center' };
  header.height = 22;
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

// ---------- EXCEL ROTAS ----------
router.get('/excel/produtos', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM produtos ORDER BY nome');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Produtos');
    ws.columns = [
      { header: 'SKU', key: 'sku', width: 18 },
      { header: 'Nome', key: 'nome', width: 30 },
      { header: 'Categoria', key: 'categoria', width: 18 },
      { header: 'Preço Custo', key: 'preco_custo', width: 15 },
      { header: 'Quantidade', key: 'quantidade', width: 12 },
      { header: 'Estoque Mínimo', key: 'estoque_minimo', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
    ];
    rows.forEach((p) => ws.addRow({
      ...p,
      status: p.quantidade <= p.estoque_minimo ? 'BAIXO' : 'OK',
    }));
    estilizarHeader(ws);
    ws.eachRow((row, i) => {
      if (i === 1) return;
      if (row.getCell('status').value === 'BAIXO') {
        row.getCell('status').font = { color: { argb: 'FFCC0000' }, bold: true };
      }
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=produtos.xlsx');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/excel/funcionarios', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM funcionarios ORDER BY nome');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Funcionários');
    ws.columns = [
      { header: 'Nome', key: 'nome', width: 30 },
      { header: 'CPF', key: 'cpf', width: 18 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Cargo', key: 'cargo', width: 20 },
      { header: 'Salário', key: 'salario', width: 15 },
      { header: 'Admissão', key: 'data_admissao', width: 15 },
      { header: 'Ativo', key: 'ativo', width: 10 },
    ];
    rows.forEach((f) => ws.addRow({
      ...f,
      data_admissao: new Date(f.data_admissao).toLocaleDateString('pt-BR'),
      ativo: f.ativo ? 'Sim' : 'Não',
    }));
    estilizarHeader(ws);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=funcionarios.xlsx');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/excel/movimentacoes', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT m.*, p.nome AS produto_nome, f.nome AS funcionario_nome
      FROM movimentacoes m
      LEFT JOIN produtos p ON p.id = m.produto_id
      LEFT JOIN funcionarios f ON f.id = m.funcionario_id
      ORDER BY m.id DESC
    `);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Movimentações');
    ws.columns = [
      { header: 'Data', key: 'data', width: 20 },
      { header: 'Produto', key: 'produto_nome', width: 30 },
      { header: 'Tipo', key: 'tipo', width: 12 },
      { header: 'Quantidade', key: 'quantidade', width: 12 },
      { header: 'Funcionário', key: 'funcionario_nome', width: 25 },
      { header: 'Observação', key: 'observacao', width: 35 },
    ];
    rows.forEach((m) => ws.addRow({
      ...m,
      data: new Date(m.criado_em).toLocaleString('pt-BR'),
      tipo: m.tipo.toUpperCase(),
    }));
    estilizarHeader(ws);
    ws.eachRow((row, i) => {
      if (i === 1) return;
      const cell = row.getCell('tipo');
      cell.font = { color: { argb: cell.value === 'ENTRADA' ? 'FF007700' : 'FFCC0000' }, bold: true };
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=movimentacoes.xlsx');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;