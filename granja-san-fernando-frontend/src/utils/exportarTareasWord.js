// Genera un documento Word con las tareas agrupadas por trabajador.
// docx se carga solo al exportar para no pesar en la carga inicial del sistema.
const dia = (valor) => String(valor || '').slice(0, 10);

export async function exportarTareasWord({ tareas, desde, hasta, etiquetaEstado }) {
  const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType } = await import('docx');

  const porTrabajador = new Map();
  tareas.forEach((t) => {
    if (!porTrabajador.has(t.trabajador_nombre)) porTrabajador.set(t.trabajador_nombre, []);
    porTrabajador.get(t.trabajador_nombre).push(t);
  });

  const celda = (texto, negrita = false) => new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: String(texto ?? ''), bold: negrita, size: 20 })] })],
  });

  const hijos = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun('Granja San Fernando')] }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Reporte de tareas por trabajador')] }),
    new Paragraph({ children: [new TextRun(`Periodo: ${desde} al ${hasta}  ·  Estado: ${etiquetaEstado}`)] }),
    new Paragraph({ children: [new TextRun(`Generado: ${new Date().toLocaleString('es-GT')}`)] }),
    new Paragraph({ children: [] }),
  ];

  [...porTrabajador.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([nombre, lista]) => {
    hijos.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(`${nombre} (${lista.length})`)] }));
    hijos.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ tableHeader: true, children: ['Descripción', 'Galera', 'Asignada', 'Fecha límite', 'Estado'].map((h) => celda(h, true)) }),
        ...lista.map((t) => new TableRow({
          children: [
            celda(t.descripcion), celda(t.galera_nombre || '—'), celda(dia(t.fecha_asignacion)),
            celda(dia(t.fecha_limite) || '—'), celda(t.estado),
          ],
        })),
      ],
    }));
    hijos.push(new Paragraph({ children: [] }));
  });

  const blob = await Packer.toBlob(new Document({ sections: [{ children: hijos }] }));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tareas_${desde}_a_${hasta}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
