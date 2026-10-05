import { FinalGameSummary } from '../types/game';

export function downloadResultsCsv(summary: FinalGameSummary) {
  const headers = [
    'Posición',
    'Nombre',
    'Ficha/Grupo',
    'Puntaje Final',
    'Respuestas Correctas',
    'Respuestas Incorrectas',
    'Precisión (%)'
  ];

  const rows = summary.participantsRanked.map(p => [
    p.rank,
    `"${p.name.replace(/"/g, '""')}"`,
    `"${(p.ficha || 'N/A').replace(/"/g, '""')}"`,
    p.score,
    p.correctCount,
    p.incorrectCount,
    `${p.accuracy}%`
  ]);

  // Add summary header block
  const dateStr = new Date().toLocaleString();
  const metaLines = [
    `"REPORTE DE ACTIVIDAD - TO BE LIVE CHALLENGE"`,
    `"Fecha: ${dateStr}"`,
    `"PIN de Sesión: ${summary.pin}"`,
    `"Total Participantes: ${summary.totalParticipants}"`,
    `"Total Preguntas: ${summary.totalQuestions}"`,
    `"Puntaje Promedio: ${summary.averageScore}"`,
    `"Puntaje Más Alto: ${summary.highestScore} (${summary.winnerName})"`,
    `"Precisión Global: ${summary.overallAccuracy}%"`,
    `"Pregunta Más Difícil: ${summary.mostDifficultQuestion ? summary.mostDifficultQuestion.questionText : 'N/A'}"`,
    `""` // Empty line before table
  ];

  const csvContent = [
    metaLines.join('\n'),
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  // Trigger download with UTF-8 BOM for Excel compatibility
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `TO_BE_CHALLENGE_RESULTS_${summary.pin}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
